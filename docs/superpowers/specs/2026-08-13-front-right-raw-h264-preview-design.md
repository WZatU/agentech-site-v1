# Front Right Raw H.264 Preview Design

## Goal

Replace the JPEG source used by the local Front Right focus preview with a low-latency H.264 stream encoded directly from the robot's uncompressed RGB topic. This is an isolated local test. It must not change the production website, LiveKit publisher, camera wall, Front Main, Front Left, or RGB-D Color behavior.

## Verified starting point

- The raw topic is `/aima/hal/sensor/stereo_head_front_right/rgb_image`.
- The raw image is RGB8 at 2064x1552 and contains 9,609,984 bytes per frame.
- The matched compressed topic reduces the same image to about 111 KB and visibly removes detail.
- The robot is NVIDIA Tegra and exposes the GStreamer `nvv4l2h264enc` hardware encoder.
- The raw source has previously delivered about 23.5 to 28 frames per second. The UI must report measured FPS and must not promise a fixed 30 FPS.

## Scope

### In scope

- Front Right focus in the local development preview only.
- Robot-side ROS 2 raw RGB subscription and NVIDIA hardware H.264 encoding.
- A dedicated framed transport from the robot to AGENTECH01.
- A dedicated WebSocket route on the AGENTECH01 preview relay.
- Browser WebCodecs H.264 decoding into the existing Front Right canvas.
- Exclusive focus behavior: Front Right H.264 is the only camera subscription while focused.
- Visible connection, codec, resolution, measured FPS, and error state.

### Out of scope

- Production website or Vercel deployment.
- LiveKit publishing.
- Camera wall behavior or resolution.
- Front Main, Front Left, and RGB-D Color focus behavior.
- Rear camera support.
- Audio or recording.
- Automatic fallback to the JPEG topic.

## Architecture

### Robot encoder service

A focused Python service runs on the robot and uses `rclpy` to subscribe to the raw Front Right RGB8 topic with best-effort, keep-last QoS. It keeps at most the newest unread frame so encoder work cannot create latency.

The service feeds RGB frames into a GStreamer pipeline. Color conversion prepares NV12 in NVIDIA memory, and `nvv4l2h264enc` produces H.264 with these initial settings:

- 2064x1552 source resolution;
- the measured source cadence, capped at 30 FPS;
- 20 Mbps target bitrate;
- one-second keyframe interval;
- no B-frames and low-latency encoder settings;
- Annex B byte-stream output aligned to complete access units;
- SPS and PPS repeated with keyframes.

The service exposes a TCP listener on the robot's private network interface. It does not expose the stream to the public internet. Each encoded access unit is wrapped in a versioned binary envelope containing flags, sequence number, presentation timestamp, width, height, and payload length. Only one downstream AGENTECH01 connection is accepted for this test.

### AGENTECH01 preview relay

The existing preview relay on port 4173 gains a dedicated WebSocket endpoint, `/h264/front-right`. It connects to the robot encoder service, validates every envelope, and forwards complete access units without decoding or re-encoding them.

The relay keeps only the newest complete access unit when a browser is backpressured. On a new browser connection it requests or waits for a keyframe before forwarding deltas. Health output includes encoder connection state, last frame time, byte rate, and forwarded frame rate.

The production relay on port 4175 and the LiveKit publisher are not changed.

### Browser decoder

When the local preview selection changes to Front Right focus:

1. The Foxglove camera WebSocket is closed, which removes all four JPEG subscriptions.
2. The browser opens `ws://127.0.0.1:4173/h264/front-right`.
3. A feature check requires WebCodecs `VideoDecoder` with H.264 support.
4. Complete H.264 access units are queued as `EncodedVideoChunk` objects using the relay timestamp and key/delta flag.
5. Decoded `VideoFrame` objects are drawn directly to the existing 2064x1552 canvas and immediately closed.
6. The decoder queue is bounded. When decode falls behind, deltas are discarded until the next keyframe instead of displaying stale video.

Changing back to Camera Wall closes and flushes the H.264 decoder, then restores the unchanged four JPEG wall subscriptions. Selecting any other focus camera uses the existing implementation unchanged.

## User interface

Front Right focus displays:

- `Front Right · 2064x1552 raw → H.264`;
- `Hardware H.264 · <measured FPS> FPS` after frames arrive;
- connection states for connecting, waiting for keyframe, decoding, and stopped;
- an explicit error when WebCodecs, the robot encoder, or the relay is unavailable.

There is no JPEG fallback in this test. A fallback would make a low-quality JPEG appear successful and invalidate the comparison.

## Failure handling

- If the raw topic stops, the encoder reports stale-source health and stops emitting repeated old frames.
- If the robot encoder disconnects, the relay closes browser stream connections with a retryable status.
- If malformed or oversized envelopes arrive, the relay drops the connection and records the reason.
- If the browser decoder errors, the page flushes it, reconnects once on the next keyframe, and shows the error if recovery fails.
- Every queue is latest-frame or bounded; no component may accumulate seconds of video history.

## Security and lifecycle

- The robot listener binds only to the robot's private interface.
- The AGENTECH01 H.264 WebSocket remains loopback-only behind the existing SSH tunnel used for local preview.
- The robot encoder is started and stopped through a narrowly scoped service definition and is enabled only for this test after validation.
- Temporary build and diagnostic artifacts are removed after deployment.
- Existing services are backed up before replacement and can be restored without changing production port 4175.

## Testing

### Unit tests

- Envelope encoding and incremental parsing across split and combined TCP reads.
- Invalid version, length, dimensions, and payload rejection.
- Backpressure keeps the newest access unit and waits for a keyframe after drops.
- Browser selection routes only Front Right focus to H.264.
- Front Right focus closes JPEG subscriptions; wall restoration recreates exactly four subscriptions.
- WebCodecs adapter maps timestamps and key flags correctly and closes every `VideoFrame`.
- Unsupported WebCodecs and decoder errors are visible and never trigger JPEG fallback.

### Robot tests

- The GStreamer pipeline reaches playing state with the raw topic.
- An encoded keyframe includes SPS/PPS and decodes to 2064x1552.
- A 30-second sample contains no black frames and reports actual source and encoded FPS.
- Robot CPU, GPU encoder, and memory usage remain stable during the sample.

### End-to-end acceptance

- Local Camera Wall still shows the same four 480x360 views.
- Opening Front Right closes all JPEG camera subscriptions.
- The page reports 2064x1552 raw-to-H.264 and displays continuous motion.
- Measured local playback approaches the robot's actual source cadence without multi-second latency.
- A mid-stream screenshot visibly preserves substantially more detail than the matched 111 KB JPEG.
- Returning to Camera Wall restores all four unchanged views.
- Browser console has no errors and the preview relay remains healthy.

## Rollback

Stop and disable the isolated robot H.264 encoder service, restore the backed-up AGENTECH01 preview relay bundle, and restart only the port 4173 preview task. Production port 4175 and LiveKit are never part of this rollback because they are not modified.
