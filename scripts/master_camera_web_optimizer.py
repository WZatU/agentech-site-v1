#!/usr/bin/env python3
"""Publish low-bitrate JPEG camera topics for the Master website."""

import argparse
import time

import cv2
import numpy as np
import rclpy
from rclpy.node import Node
from rclpy.qos import (
    DurabilityPolicy,
    HistoryPolicy,
    QoSProfile,
    ReliabilityPolicy,
)
from sensor_msgs.msg import CompressedImage

from master_camera_web_policy import should_process_frame


def build_gstreamer_pipeline(*, width, height, quality):
    return (
        "appsrc name=input is-live=true block=false format=time do-timestamp=true "
        "caps=image/jpeg,framerate=30/1 ! "
        "queue max-size-buffers=1 leaky=downstream ! "
        "nvjpegdec ! nvvidconv interpolation-method=1 ! "
        f"video/x-raw(memory:NVMM),width={width},height={height},format=I420 ! "
        f"nvjpegenc quality={quality} ! "
        "appsink name=output emit-signals=true sync=false max-buffers=1 drop=true"
    )


def calculate_stream_statistics(*, frame_count, total_bytes, elapsed_seconds):
    if frame_count <= 0 or elapsed_seconds <= 0:
        return 0.0, 0.0
    return frame_count / elapsed_seconds, total_bytes / frame_count / 1024


class FrameRateGate:
    """Select source frames against a fixed clock without accumulating drift."""

    def __init__(self, *, max_fps):
        self._interval = 1.0 / max_fps
        self._next_deadline = None

    def should_emit(self, now):
        if self._next_deadline is None:
            self._next_deadline = now + self._interval
            return True
        if now + (self._interval * 1e-6) < self._next_deadline:
            return False
        intervals_elapsed = int((now - self._next_deadline) / self._interval)
        self._next_deadline += (intervals_elapsed + 1) * self._interval
        return True


def optimize_jpeg(data, *, width, height, quality):
    source = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if source is None:
        raise ValueError("camera payload is not a decodable image")

    source_height, source_width = source.shape[:2]
    scale = min(width / source_width, height / source_height)
    resized_width = max(1, round(source_width * scale))
    resized_height = max(1, round(source_height * scale))
    resized = cv2.resize(
        source,
        (resized_width, resized_height),
        interpolation=cv2.INTER_AREA,
    )

    canvas = np.zeros((height, width, 3), dtype=np.uint8)
    left = (width - resized_width) // 2
    top = (height - resized_height) // 2
    canvas[top : top + resized_height, left : left + resized_width] = resized

    ok, encoded = cv2.imencode(
        ".jpg",
        canvas,
        [cv2.IMWRITE_JPEG_QUALITY, quality],
    )
    if not ok:
        raise ValueError("OpenCV failed to encode the optimized image")
    return encoded.tobytes()


class CameraWebOptimizer(Node):
    def __init__(self, args):
        super().__init__(args.node_name)
        self._width = args.width
        self._height = args.height
        self._quality = args.quality
        self._pause_without_subscribers = args.pause_without_subscribers
        self._rate_gate = FrameRateGate(max_fps=args.max_fps)
        self._stats_started_at = time.monotonic()
        self._stats_frames = 0
        self._stats_bytes = 0

        input_qos = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            durability=DurabilityPolicy.VOLATILE,
            history=HistoryPolicy.KEEP_LAST,
            depth=1,
        )
        output_qos = QoSProfile(
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.VOLATILE,
            history=HistoryPolicy.KEEP_LAST,
            depth=1,
        )
        self._publisher = self.create_publisher(
            CompressedImage, args.output_topic, output_qos
        )
        self._subscription = self.create_subscription(
            CompressedImage,
            args.input_topic,
            self._on_image,
            input_qos,
        )
        self._latest_header = None
        self._initialize_hardware_pipeline()
        self.get_logger().info(
            f"Optimizing {args.input_topic} -> {args.output_topic} at "
            f"{args.width}x{args.height}, JPEG quality {args.quality}, "
            f"up to {args.max_fps:g} FPS, subscriber-aware pause "
            f"{'enabled' if args.pause_without_subscribers else 'disabled'}"
        )

    def _initialize_hardware_pipeline(self):
        import gi

        gi.require_version("Gst", "1.0")
        from gi.repository import Gst

        Gst.init(None)
        self._gst = Gst
        self._pipeline = Gst.parse_launch(
            build_gstreamer_pipeline(
                width=self._width,
                height=self._height,
                quality=self._quality,
            )
        )
        self._appsrc = self._pipeline.get_by_name("input")
        self._appsink = self._pipeline.get_by_name("output")
        self._appsink.connect("new-sample", self._on_hardware_sample)
        result = self._pipeline.set_state(Gst.State.PLAYING)
        if result == Gst.StateChangeReturn.FAILURE:
            raise RuntimeError("failed to start the NVIDIA JPEG pipeline")

    def _on_image(self, message):
        if not should_process_frame(
            self._pause_without_subscribers,
            self._publisher.get_subscription_count(),
        ):
            return
        started_at = time.monotonic()
        if not self._rate_gate.should_emit(started_at):
            return
        self._latest_header = message.header
        data = bytes(message.data)
        buffer = self._gst.Buffer.new_allocate(None, len(data), None)
        buffer.fill(0, data)
        result = self._appsrc.emit("push-buffer", buffer)
        if result != self._gst.FlowReturn.OK:
            self.get_logger().warning(f"hardware pipeline rejected a frame: {result}")

    def _on_hardware_sample(self, sink):
        sampled_at = time.monotonic()
        sample = sink.emit("pull-sample")
        if sample is None:
            return self._gst.FlowReturn.ERROR
        buffer = sample.get_buffer()
        mapped, map_info = buffer.map(self._gst.MapFlags.READ)
        if not mapped:
            return self._gst.FlowReturn.ERROR
        data = bytes(map_info.data)
        buffer.unmap(map_info)

        output = CompressedImage()
        if self._latest_header is not None:
            output.header = self._latest_header
        output.format = "jpeg"
        output.data = data
        self._publisher.publish(output)

        self._stats_frames += 1
        self._stats_bytes += len(data)
        elapsed = sampled_at - self._stats_started_at
        if elapsed >= 5:
            fps, average_kib = calculate_stream_statistics(
                frame_count=self._stats_frames,
                total_bytes=self._stats_bytes,
                elapsed_seconds=elapsed,
            )
            self.get_logger().info(
                f"Published {fps:.1f} FPS, average payload {average_kib:.1f} KiB"
            )
            self._stats_started_at = sampled_at
            self._stats_frames = 0
            self._stats_bytes = 0
        return self._gst.FlowReturn.OK

    def destroy_node(self):
        if hasattr(self, "_pipeline"):
            self._pipeline.set_state(self._gst.State.NULL)
        return super().destroy_node()


def parse_args(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-topic", required=True)
    parser.add_argument("--output-topic", required=True)
    parser.add_argument("--node-name", required=True)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=360)
    parser.add_argument("--quality", type=int, default=35)
    parser.add_argument("--max-fps", type=float, default=30)
    parser.add_argument("--pause-without-subscribers", action="store_true")
    args = parser.parse_args(argv)
    if args.width <= 0 or args.height <= 0:
        parser.error("width and height must be positive")
    if not 1 <= args.quality <= 100:
        parser.error("quality must be between 1 and 100")
    if args.max_fps <= 0:
        parser.error("max-fps must be positive")
    return args


def main():
    cv2.setNumThreads(1)
    args = parse_args()
    rclpy.init()
    node = CameraWebOptimizer(args)
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
