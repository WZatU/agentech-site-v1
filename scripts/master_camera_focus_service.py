#!/usr/bin/env python3
"""Serve one on-demand high-resolution Master focus view at a time."""

import threading
import time

import rclpy
from rclpy.node import Node
from rclpy.qos import (
    DurabilityPolicy,
    HistoryPolicy,
    QoSProfile,
    ReliabilityPolicy,
)
from sensor_msgs.msg import CompressedImage

from master_camera_focus_policy import select_active_front, should_forward_rgbd


FOCUS_WIDTH = 960
FOCUS_HEIGHT = 720
FOCUS_QUALITY = 50
FOCUS_MAX_FPS = 30
FRONT_SWITCH_SETTLE_SECONDS = 0.2

FRONT_CAMERAS = {
    "front-main": (
        "/aima/hal/sensor/rgb_head_front_center/rgb_image/compressed",
        "/agentech/web/focus/front_main/compressed",
    ),
    "front-left": (
        "/aima/hal/sensor/stereo_head_front_left/rgb_image/compressed",
        "/agentech/web/focus/front_left/compressed",
    ),
    "front-right": (
        "/aima/hal/sensor/stereo_head_front_right/rgb_image/compressed",
        "/agentech/web/focus/front_right/compressed",
    ),
}
FRONT_PRIORITY = tuple(FRONT_CAMERAS)
RGBD_INPUT_TOPIC = "/aima/hal/sensor/rgbd_head_front/rgb_image/compressed"
RGBD_OUTPUT_TOPIC = "/agentech/web/focus/rgbd_color/compressed"


def build_gstreamer_pipeline():
    return (
        "appsrc name=input is-live=true block=false format=time do-timestamp=true "
        "caps=image/jpeg,framerate=30/1 ! "
        "queue max-size-buffers=1 leaky=downstream ! "
        "nvjpegdec ! nvvidconv interpolation-method=1 ! "
        f"video/x-raw(memory:NVMM),width={FOCUS_WIDTH},height={FOCUS_HEIGHT},format=I420 ! "
        f"nvjpegenc quality={FOCUS_QUALITY} ! "
        "appsink name=output emit-signals=true sync=false max-buffers=1 drop=true"
    )


class FrameRateGate:
    def __init__(self, max_fps):
        self._interval = 1.0 / max_fps
        self._next_deadline = None

    def reset(self):
        self._next_deadline = None

    def should_emit(self, now):
        if self._next_deadline is None:
            self._next_deadline = now + self._interval
            return True
        if now < self._next_deadline:
            return False
        intervals_elapsed = int((now - self._next_deadline) / self._interval)
        self._next_deadline += (intervals_elapsed + 1) * self._interval
        return True


class MasterCameraFocusService(Node):
    def __init__(self):
        super().__init__("agentech_master_camera_focus")
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

        self._front_publishers = {
            camera_id: self.create_publisher(CompressedImage, output_topic, output_qos)
            for camera_id, (_, output_topic) in FRONT_CAMERAS.items()
        }
        self._front_subscriptions = [
            self.create_subscription(
                CompressedImage,
                input_topic,
                lambda message, camera_id=camera_id: self._on_front_image(
                    camera_id, message
                ),
                input_qos,
            )
            for camera_id, (input_topic, _) in FRONT_CAMERAS.items()
        ]
        self._rgbd_publisher = self.create_publisher(
            CompressedImage, RGBD_OUTPUT_TOPIC, output_qos
        )
        self._rgbd_subscription = self.create_subscription(
            CompressedImage, RGBD_INPUT_TOPIC, self._on_rgbd_image, input_qos
        )

        self._front_pipeline = None
        self._appsrc = None
        self._appsink = None
        self._gst = None
        self._rate_gate = FrameRateGate(FOCUS_MAX_FPS)
        self._active_front = None
        self._settle_until = 0.0
        self._latest_header = None
        self._latest_output_camera = None
        self._state_lock = threading.Lock()
        self.get_logger().info(
            f"Shared focus service ready: one {FOCUS_WIDTH}x{FOCUS_HEIGHT} "
            f"front stream at up to {FOCUS_MAX_FPS} FPS; RGB-D native passthrough"
        )

    def _subscription_counts(self):
        return {
            camera_id: publisher.get_subscription_count()
            for camera_id, publisher in self._front_publishers.items()
        }

    def _initialize_front_pipeline(self):
        if self._front_pipeline is not None:
            return
        import gi

        gi.require_version("Gst", "1.0")
        from gi.repository import Gst

        Gst.init(None)
        self._gst = Gst
        self._front_pipeline = Gst.parse_launch(build_gstreamer_pipeline())
        self._appsrc = self._front_pipeline.get_by_name("input")
        self._appsink = self._front_pipeline.get_by_name("output")
        self._appsink.connect("new-sample", self._on_hardware_sample)
        result = self._front_pipeline.set_state(Gst.State.PLAYING)
        if result == Gst.StateChangeReturn.FAILURE:
            self._front_pipeline.set_state(Gst.State.NULL)
            self._front_pipeline = None
            self._appsrc = None
            self._appsink = None
            raise RuntimeError("failed to start the shared NVIDIA focus pipeline")
        self.get_logger().info("Shared NVIDIA focus pipeline started")

    def _on_front_image(self, camera_id, message):
        active_front = select_active_front(
            self._subscription_counts(), FRONT_PRIORITY
        )
        if active_front is None or camera_id != active_front:
            return

        now = time.monotonic()
        if active_front != self._active_front:
            self._active_front = active_front
            self._settle_until = now + FRONT_SWITCH_SETTLE_SECONDS
            self._rate_gate.reset()
            self.get_logger().info(f"Focus switched to {active_front}")
            return
        if now < self._settle_until or not self._rate_gate.should_emit(now):
            return

        if self._front_pipeline is None:
            try:
                self._initialize_front_pipeline()
            except Exception as error:
                self.get_logger().error(f"Shared focus pipeline unavailable: {error}")
                return

        with self._state_lock:
            self._latest_header = message.header
            self._latest_output_camera = camera_id

        payload = bytes(message.data)
        buffer = self._gst.Buffer.new_allocate(None, len(payload), None)
        buffer.fill(0, payload)
        result = self._appsrc.emit("push-buffer", buffer)
        if result != self._gst.FlowReturn.OK:
            self.get_logger().warning(f"Shared focus pipeline rejected a frame: {result}")

    def _on_hardware_sample(self, sink):
        sample = sink.emit("pull-sample")
        if sample is None:
            return self._gst.FlowReturn.ERROR
        buffer = sample.get_buffer()
        mapped, map_info = buffer.map(self._gst.MapFlags.READ)
        if not mapped:
            return self._gst.FlowReturn.ERROR
        payload = bytes(map_info.data)
        buffer.unmap(map_info)

        with self._state_lock:
            camera_id = self._latest_output_camera
            header = self._latest_header
        if camera_id is None:
            return self._gst.FlowReturn.OK

        output = CompressedImage()
        if header is not None:
            output.header = header
        output.format = "jpeg"
        output.data = payload
        self._front_publishers[camera_id].publish(output)
        return self._gst.FlowReturn.OK

    def _on_rgbd_image(self, message):
        if should_forward_rgbd(self._rgbd_publisher.get_subscription_count()):
            self._rgbd_publisher.publish(message)

    def destroy_node(self):
        if self._front_pipeline is not None:
            self._front_pipeline.set_state(self._gst.State.NULL)
        return super().destroy_node()


def main():
    rclpy.init()
    node = MasterCameraFocusService()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
