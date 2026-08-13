# Front Right Raw H.264 Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the local Front Right focus view from the robot's uncompressed RGB topic through NVIDIA hardware H.264 encoding, without changing production LiveKit or any other camera mode.

**Architecture:** A robot-side ROS 2/GStreamer service converts RGB8 frames to low-latency Annex B H.264 and sends versioned access-unit envelopes over private TCP. The AGENTECH01 port 4173 preview relay validates and forwards those envelopes on a dedicated WebSocket, and the local website decodes them with WebCodecs into the existing 2064x1552 canvas. Front Right focus uses only this H.264 path; wall and other focus modes retain the current JPEG path.

**Tech Stack:** Python 3, ROS 2 `rclpy`, GStreamer 1.20, NVIDIA `nvv4l2h264enc`, Node.js `net` and `ws`, WebCodecs `VideoDecoder`, Next.js/React, Node test runner, Python `unittest`.

## Global Constraints

- The test changes only local Front Right focus.
- Production port 4175, LiveKit, Vercel, Camera Wall, Front Main, Front Left, and RGB-D Color must remain unchanged.
- Encode 2064x1552 RGB8 with the NVIDIA hardware encoder at the measured source cadence capped at 30 FPS.
- Start with a 20 Mbps target bitrate, one-second keyframes, no B-frames, Annex B byte stream, access-unit alignment, and SPS/PPS repeated on keyframes.
- Front Right focus must close all JPEG camera subscriptions and must never silently fall back to JPEG.
- Every queue must be bounded or latest-frame-only; stale video must be dropped, never accumulated.
- The browser must visibly report connection state, codec, resolution, measured FPS, and failures.
- The robot listener is private-network-only; the browser WebSocket remains loopback-only through AGENTECH01 port 4173.
- Deployment must be recoverable and must not modify or restart production port 4175.

## File structure

### Agentech SDK repository

- `agentech/robots/master/master vision app/robot/front_right_h264_protocol.py`: pure Python envelope encoder shared by the robot service and Python tests.
- `agentech/robots/master/master vision app/robot/front_right_h264_protocol_test.py`: Python protocol tests with no ROS or GStreamer dependency.
- `agentech/robots/master/master vision app/robot/front_right_h264_encoder.py`: ROS 2 raw subscriber, latest-frame gate, GStreamer hardware encoder, TCP server, and health logging.
- `agentech/robots/master/master vision app/robot/agentech-front-right-h264.service`: scoped user-service definition for the test encoder.
- `agentech/robots/master/master vision app/server/front-right-h264-protocol.cjs`: incremental Node envelope parser and validation constants.
- `agentech/robots/master/master vision app/server/front-right-h264-protocol.test.cjs`: split-read, combined-read, and invalid-envelope tests.
- `agentech/robots/master/master vision app/server/front-right-h264-upstream.cjs`: one TCP upstream, keyframe gating, bounded downstream fan-out, and health state.
- `agentech/robots/master/master vision app/server/front-right-h264-upstream.test.cjs`: upstream reconnect, backpressure, and keyframe recovery tests.
- `agentech/robots/master/master vision app/server/share-server.cjs`: adds `/h264/front-right` and H.264 health without changing `/robot`, `/sdk`, or gateway behavior.
- `agentech/robots/master/master vision app/server/share-server.test.cjs`: route and health integration tests.

### Main website repository

- `features/eaic/05-delivery/live-results/components/master-h264-preview.mjs`: dependency-injected WebCodecs client, envelope reader, queue policy, FPS measurement, and canvas renderer.
- `features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx`: selects the H.264 client only for local Front Right focus and keeps the existing JPEG effect for every other selection.
- `scripts/master-h264-preview.test.mjs`: WebCodecs mock tests and source-level selection regression checks.
- `scripts/master-live-camera-ui.test.mjs`: asserts Front Right H.264 copy and unchanged wall/other focus behavior.

---

### Task 1: Define and test the versioned H.264 access-unit protocol

**Files:**
- Create: `agentech/robots/master/master vision app/robot/front_right_h264_protocol.py`
- Create: `agentech/robots/master/master vision app/robot/front_right_h264_protocol_test.py`
- Create: `agentech/robots/master/master vision app/server/front-right-h264-protocol.cjs`
- Create: `agentech/robots/master/master vision app/server/front-right-h264-protocol.test.cjs`

**Interfaces:**
- Produces Python `encode_access_unit(sequence: int, timestamp_us: int, width: int, height: int, keyframe: bool, payload: bytes) -> bytes`.
- Produces Node `H264EnvelopeParser` with `push(chunk: Buffer) -> Array<H264Envelope>`.
- `H264Envelope` is `{ sequence: number, timestampUs: bigint, width: number, height: number, keyframe: boolean, payload: Buffer, wire: Buffer }`.
- The 28-byte network-order header is magic `AH26`, version `1`, flags byte, header length `28`, sequence `u32`, timestamp microseconds `u64`, width `u16`, height `u16`, and payload length `u32`.
- Flag bit `0` means keyframe. Other flag bits must be zero.
- Maximum payload is 8 MiB; accepted dimensions are 1 through 8192.

- [ ] **Step 1: Write failing Python envelope tests**

```python
class ProtocolTest(unittest.TestCase):
    def test_encode_access_unit_matches_wire_contract(self):
        wire = encode_access_unit(7, 123456, 2064, 1552, True, b"\x00\x00\x00\x01\x65")
        self.assertEqual(wire[:4], b"AH26")
        self.assertEqual(wire[4], 1)
        self.assertEqual(wire[5], 1)
        self.assertEqual(struct.unpack(">H", wire[6:8])[0], 28)
        self.assertEqual(struct.unpack(">I", wire[8:12])[0], 7)
        self.assertEqual(struct.unpack(">Q", wire[12:20])[0], 123456)
        self.assertEqual(struct.unpack(">HHI", wire[20:28]), (2064, 1552, 5))
        self.assertEqual(wire[28:], b"\x00\x00\x00\x01\x65")
```

- [ ] **Step 2: Run the Python test and verify it fails because the protocol module does not exist**

Run: `python -m unittest robot/front_right_h264_protocol_test.py -v`

Expected: FAIL with `ModuleNotFoundError: front_right_h264_protocol`.

- [ ] **Step 3: Implement the minimal Python encoder with exact range validation**

```python
HEADER = struct.Struct(">4sBBHIQHHI")
MAGIC = b"AH26"
VERSION = 1
MAX_PAYLOAD_BYTES = 8 * 1024 * 1024

def encode_access_unit(sequence, timestamp_us, width, height, keyframe, payload):
    payload = bytes(payload)
    if not 0 <= sequence <= 0xFFFFFFFF: raise ValueError("sequence out of range")
    if not 0 <= timestamp_us <= 0xFFFFFFFFFFFFFFFF: raise ValueError("timestamp out of range")
    if not 1 <= width <= 8192 or not 1 <= height <= 8192: raise ValueError("invalid dimensions")
    if not 1 <= len(payload) <= MAX_PAYLOAD_BYTES: raise ValueError("invalid payload length")
    return HEADER.pack(MAGIC, VERSION, int(bool(keyframe)), HEADER.size, sequence, timestamp_us, width, height, len(payload)) + payload
```

- [ ] **Step 4: Run the Python protocol test and verify it passes**

Run: `python -m unittest robot/front_right_h264_protocol_test.py -v`

Expected: PASS.

- [ ] **Step 5: Write failing Node parser tests for one frame, split reads, combined reads, bad magic, oversized payload, and unsupported flags**

```js
test("parser preserves one split access unit", () => {
  const parser = new H264EnvelopeParser();
  assert.deepEqual(parser.push(wire.subarray(0, 11)), []);
  const [frame] = parser.push(wire.subarray(11));
  assert.equal(frame.sequence, 7);
  assert.equal(frame.timestampUs, 123456n);
  assert.equal(frame.width, 2064);
  assert.equal(frame.height, 1552);
  assert.equal(frame.keyframe, true);
  assert.deepEqual(frame.payload, payload);
  assert.deepEqual(frame.wire, wire);
});
```

- [ ] **Step 6: Run the Node protocol test and verify it fails because the parser does not exist**

Run: `node --test server/front-right-h264-protocol.test.cjs`

Expected: FAIL with `MODULE_NOT_FOUND`.

- [ ] **Step 7: Implement `H264EnvelopeParser` with a bounded internal buffer and exact header validation**

The parser must copy only completed frame wire buffers, retain at most one partial frame, throw `H264ProtocolError` for invalid input, and clear its buffer after an error.

- [ ] **Step 8: Run both protocol suites and verify they pass**

Run: `python -m unittest robot/front_right_h264_protocol_test.py -v`

Run: `node --test server/front-right-h264-protocol.test.cjs`

Expected: both PASS.

- [ ] **Step 9: Commit the protocol contract**

```powershell
git add -- 'agentech/robots/master/master vision app/robot/front_right_h264_protocol.py' 'agentech/robots/master/master vision app/robot/front_right_h264_protocol_test.py' 'agentech/robots/master/master vision app/server/front-right-h264-protocol.cjs' 'agentech/robots/master/master vision app/server/front-right-h264-protocol.test.cjs'
git commit -m "feat: define Front Right H264 transport"
```

### Task 2: Build and validate the robot NVIDIA encoder service

**Files:**
- Create: `agentech/robots/master/master vision app/robot/front_right_h264_encoder.py`
- Create: `agentech/robots/master/master vision app/robot/agentech-front-right-h264.service`
- Modify: `agentech/robots/master/master vision app/robot/front_right_h264_protocol_test.py`

**Interfaces:**
- Consumes `encode_access_unit(...)` from Task 1.
- Produces TCP access units at `AGENTECH_H264_BIND_HOST` and `AGENTECH_H264_PORT`, defaulting to `192.168.4.114:22164` for this test.
- Produces newline JSON health on stdout with `sourceFps`, `encodedFps`, `bytesPerSecond`, `clients`, `lastFrameAt`, `width`, and `height` every two seconds.
- `LatestFrameGate.offer(frame) -> None` replaces an unread RGB frame.
- `LatestFrameGate.take() -> RawFrame | None` returns and clears the newest frame.
- `create_pipeline(width, height, fps, bitrate) -> Gst.Pipeline` uses `appsrc`, color conversion, NVIDIA memory, `nvv4l2h264enc`, `h264parse`, and `appsink`.

- [ ] **Step 1: Extend the Python tests with a failing latest-frame gate test and pipeline-string policy test**

```python
def test_latest_frame_gate_discards_superseded_frames(self):
    gate = LatestFrameGate()
    gate.offer("old")
    gate.offer("new")
    self.assertEqual(gate.take(), "new")
    self.assertIsNone(gate.take())

def test_pipeline_policy_uses_hardware_low_latency_h264(self):
    value = pipeline_description(2064, 1552, 30, 20_000_000)
    self.assertIn("nvv4l2h264enc", value)
    self.assertIn("bitrate=20000000", value)
    self.assertIn("iframeinterval=30", value)
    self.assertIn("insert-sps-pps=true", value)
    self.assertIn("stream-format=byte-stream", value)
    self.assertIn("alignment=au", value)
```

- [ ] **Step 2: Run the Python suite and verify the new tests fail**

Run: `python -m unittest robot/front_right_h264_protocol_test.py -v`

Expected: FAIL because `LatestFrameGate` and `pipeline_description` do not exist.

- [ ] **Step 3: Implement the robot service with lazy ROS/GStreamer imports**

Keep `LatestFrameGate` and `pipeline_description` importable without ROS or GStreamer so local tests run. The runtime path must:

- subscribe only after one TCP client connects;
- keep the newest unread RGB8 frame;
- stamp frames with ROS time when present and monotonic microseconds otherwise;
- push frames into `appsrc` without blocking the ROS callback;
- treat `appsink` buffers as one complete access unit;
- detect keyframes through `Gst.BufferFlags.DELTA_UNIT`;
- frame output with Task 1's protocol;
- use `TCP_NODELAY` and a bounded single-writer queue;
- stop subscribing and flush GStreamer when the client disconnects.

- [ ] **Step 4: Add the user-service definition with exact runtime environment**

```ini
[Unit]
Description=Agentech Front Right raw H264 preview
After=network-online.target

[Service]
Type=simple
Environment=AGENTECH_H264_BIND_HOST=192.168.4.114
Environment=AGENTECH_H264_PORT=22164
Environment=AGENTECH_H264_BITRATE=20000000
ExecStart=/bin/bash -lc 'source /agibot/software/entry/cfg/env.sh && exec /usr/bin/python3 %h/agentech-front-right-h264/front_right_h264_encoder.py'
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
```

- [ ] **Step 5: Run local Python tests and syntax compilation**

Run: `python -m unittest robot/front_right_h264_protocol_test.py -v`

Run: `python -m py_compile robot/front_right_h264_protocol.py robot/front_right_h264_encoder.py`

Expected: PASS and exit 0.

- [ ] **Step 6: Upload the service into a temporary robot directory and run a 10-second foreground encoder probe**

The probe must source `/agibot/software/entry/cfg/env.sh`, start the service without installing it, connect a validation client, save complete access units, and report keyframes, bytes, FPS, and pipeline errors.

Expected: at least one keyframe, 2064x1552 envelopes, 18 or more encoded frames per second, and no GStreamer errors.

- [ ] **Step 7: Decode the foreground sample with FFmpeg and inspect first, middle, and last frames**

Run FFmpeg over the Annex B payload sample and require exit 0. Extract three JPEGs and verify their average luma exceeds 5 so a black stream cannot pass.

- [ ] **Step 8: Install the recoverable robot user service but do not enable it until relay integration is ready**

Back up an existing `~/agentech-front-right-h264` directory with a timestamp, upload the two Python files and service definition, run `systemctl --user daemon-reload`, and leave the unit stopped.

- [ ] **Step 9: Commit the robot encoder**

```powershell
git add -- 'agentech/robots/master/master vision app/robot/front_right_h264_encoder.py' 'agentech/robots/master/master vision app/robot/agentech-front-right-h264.service' 'agentech/robots/master/master vision app/robot/front_right_h264_protocol_test.py'
git commit -m "feat: encode raw Front Right with NVIDIA H264"
```

### Task 3: Add bounded H.264 forwarding to the AGENTECH01 preview relay

**Files:**
- Create: `agentech/robots/master/master vision app/server/front-right-h264-upstream.cjs`
- Create: `agentech/robots/master/master vision app/server/front-right-h264-upstream.test.cjs`
- Modify: `agentech/robots/master/master vision app/server/share-server.cjs`
- Modify: `agentech/robots/master/master vision app/server/share-server.test.cjs`

**Interfaces:**
- Consumes `H264EnvelopeParser` from Task 1.
- Produces `createFrontRightH264Upstream({ host, port, reconnectMs, maxBufferedBytes, connect })`.
- Returns `{ attach(client), detach(client), health(), stop() }`.
- Adds WebSocket endpoint `/h264/front-right` on the existing loopback HTTP server.
- Adds `frontRightH264` to `/health` with `state`, `viewers`, `waitingForKeyframe`, `framesReceived`, `framesForwarded`, `bytesReceived`, `sourceFps`, `forwardedFps`, and `lastFrameAt`.

- [ ] **Step 1: Write failing upstream tests with fake TCP and WebSocket peers**

Cover these exact cases:

- no TCP connection until one browser attaches;
- first forwarded frame must be a keyframe;
- each wire buffer is forwarded byte-for-byte;
- a slow browser keeps only the newest pending frame;
- after dropping a delta, the browser waits for the next keyframe;
- last browser detachment closes TCP and clears queued data;
- reconnect after upstream close uses the configured delay.

- [ ] **Step 2: Run the upstream test and verify it fails with `MODULE_NOT_FOUND`**

Run: `node --test server/front-right-h264-upstream.test.cjs`

Expected: FAIL.

- [ ] **Step 3: Implement the minimal upstream manager and bounded fan-out**

Use `net.createConnection`, `socket.setNoDelay(true)`, Task 1's parser, and per-client state `{ sending, pendingWire, needsKeyframe }`. Never concatenate multiple video frames for a downstream send.

- [ ] **Step 4: Run the upstream tests and verify they pass**

Run: `node --test server/front-right-h264-upstream.test.cjs`

Expected: PASS.

- [ ] **Step 5: Write failing share-server integration tests**

Assert that `/h264/front-right` upgrades through a dedicated `WebSocketServer`, `/robot` behavior stays unchanged, `/sdk` authentication stays unchanged, and `/health.frontRightH264` reports the upstream health object.

- [ ] **Step 6: Run the share-server tests and verify the new assertions fail**

Run: `node --test server/share-server.test.cjs`

Expected: FAIL because the H.264 route is absent.

- [ ] **Step 7: Integrate the H.264 manager into `startShareServer`**

Read `AGENTECH_FRONT_RIGHT_H264_HOST`, `AGENTECH_FRONT_RIGHT_H264_PORT`, and `AGENTECH_FRONT_RIGHT_H264_RECONNECT_MS`. Default to `192.168.4.114`, `22164`, and `1000`. Create the manager only for the port 4173 preview process or when explicitly enabled with `AGENTECH_FRONT_RIGHT_H264_ENABLED=1`. Close it during server stop.

- [ ] **Step 8: Run the full SDK test suite**

Run: `npm test`

Expected: every existing and new test passes.

- [ ] **Step 9: Commit the preview relay**

```powershell
git add -- 'agentech/robots/master/master vision app/server/front-right-h264-upstream.cjs' 'agentech/robots/master/master vision app/server/front-right-h264-upstream.test.cjs' 'agentech/robots/master/master vision app/server/share-server.cjs' 'agentech/robots/master/master vision app/server/share-server.test.cjs'
git commit -m "feat: relay Front Right H264 preview"
```

### Task 4: Decode Front Right H.264 in the local website

**Files:**
- Create: `features/eaic/05-delivery/live-results/components/master-h264-preview.mjs`
- Create: `scripts/master-h264-preview.test.mjs`
- Modify: `features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx`
- Modify: `scripts/master-live-camera-ui.test.mjs`

**Interfaces:**
- Produces `startMasterH264Preview({ url, canvas, WebSocketImpl, VideoDecoderImpl, EncodedVideoChunkImpl, now, onState }) -> () => void`.
- `onState` receives `{ phase, width, height, fps, codec, error }` where phase is `connecting`, `keyframe`, `decoding`, `stopped`, or `error`.
- The default URL derives from `NEXT_PUBLIC_MASTER_CAMERA_RELAY_URL` by changing `/robot` to `/h264/front-right`.

- [ ] **Step 1: Write failing WebCodecs adapter tests**

Use fake WebSocket, `VideoDecoder`, `EncodedVideoChunk`, `VideoFrame`, canvas, and clock. Assert:

- H.264 support is required before opening the socket;
- key and delta flags map to chunk types;
- `timestampUs` maps to the chunk timestamp without conversion loss;
- decoded 2064x1552 frames resize the canvas once, draw, and close;
- FPS uses decoded frames in the latest one-second window;
- a decode queue above two drops deltas and waits for a keyframe;
- cleanup closes the socket, flushes/resets/closes the decoder, and closes undrawn frames;
- protocol errors and decoder errors call `onState({ phase: "error" })`;
- no code path opens the JPEG `/robot` URL.

- [ ] **Step 2: Run the new test and verify it fails with `MODULE_NOT_FOUND`**

Run: `node --test scripts/master-h264-preview.test.mjs`

Expected: FAIL.

- [ ] **Step 3: Implement the H.264 preview client**

Configure `VideoDecoder` with `{ codec: "avc1.640032", optimizeForLatency: true, hardwareAcceleration: "prefer-hardware" }`. Feed Annex B `EncodedVideoChunk` data from the envelope payload. Keep only decoded frames that can be painted immediately and call `frame.close()` in `finally`.

- [ ] **Step 4: Run the H.264 client tests and verify they pass**

Run: `node --test scripts/master-h264-preview.test.mjs`

Expected: PASS.

- [ ] **Step 5: Extend UI regression tests before modifying the React component**

Assert source text contains an exact Front Right focus predicate, imports `startMasterH264Preview`, displays `2064x1552 raw → H.264`, and preserves the existing JPEG resolver for wall and non-Front-Right selections.

- [ ] **Step 6: Run the UI test and verify the new assertions fail**

Run: `node --test scripts/master-live-camera-ui.test.mjs`

Expected: FAIL because the component has no H.264 path.

- [ ] **Step 7: Split the React effect by transport without duplicating UI state**

Compute `useRawH264 = selection.mode === "focus" && selection.cameraId === "front-right"`. In that case start only `startMasterH264Preview`; otherwise run the existing Foxglove JPEG effect unchanged. Render the H.264 state in the existing status and label elements. Cleanup must finish before the alternate transport starts.

- [ ] **Step 8: Run website tests and TypeScript checks**

Run: `node --test scripts/master-h264-preview.test.mjs scripts/master-live-camera.test.mjs scripts/master-live-camera-ui.test.mjs scripts/master-live-camera-state.test.mjs scripts/master-live-camera-gateway.test.mjs`

Run: `npx tsc --noEmit`

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 9: Commit the website preview path**

```powershell
git add -- 'features/eaic/05-delivery/live-results/components/master-h264-preview.mjs' 'features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx' 'scripts/master-h264-preview.test.mjs' 'scripts/master-live-camera-ui.test.mjs'
git commit -m "feat: decode raw Front Right H264 preview"
```

### Task 5: Deploy the isolated test and verify the complete local flow

**Files:**
- Modify on robot: `~/agentech-front-right-h264/*` and `~/.config/systemd/user/agentech-front-right-h264.service`
- Modify on AGENTECH01: preview relay source and scheduled task `Agentech Master Camera Preview Relay`
- Do not modify: production scheduled task `Agentech Master Wired Camera Relay`, production publisher, production port 4175, or Vercel.

**Interfaces:**
- Robot health is service JSON logs plus TCP access units at `192.168.4.114:22164`.
- AGENTECH01 health is `http://127.0.0.1:4173/health`.
- Local acceptance URL is `http://localhost:3200/agentech-products/eaic-hub/watch-live-run?masterCameraPreview=1`.

- [ ] **Step 1: Run fresh pre-deployment verification**

Run the full SDK suite, Python suite, website Master suites, TypeScript, SDK production build, and website production build. Record exact pass counts and build exit codes.

- [ ] **Step 2: Capture recoverable backups and current health**

Record hashes of the AGENTECH01 preview relay files, scheduled task XML/action, port 4173 health, port 4175 health, and robot service directory if present. Save backups with timestamp suffixes; do not delete old working versions.

- [ ] **Step 3: Install and start the robot user service**

Upload the verified files, install the service definition, run `systemctl --user daemon-reload`, `systemctl --user enable --now agentech-front-right-h264.service`, and confirm the service is active with a recent source frame only after AGENTECH01 connects.

- [ ] **Step 4: Deploy and restart only the AGENTECH01 port 4173 preview relay**

Update only the tested server source files. Add `AGENTECH_FRONT_RIGHT_H264_ENABLED=1`, host `192.168.4.114`, and port `22164` to the preview task action. Restart `Agentech Master Camera Preview Relay` through its hidden scheduled task. Do not stop or restart port 4175.

- [ ] **Step 5: Verify relay health and encoded transport for 30 seconds**

Require robot encoder connection `connected`, one H.264 upstream only when viewed, at least one keyframe, resolution 2064x1552, forwarded FPS within 20% of source FPS, bounded downstream buffer, and no reconnect loop. Measure Mbps and compare it with the 20 Mbps target.

- [ ] **Step 6: Start or reuse the local Next.js server and SSH tunnel**

Use a hidden launcher, verify HTTP 200 on port 3200 and 4173 `/health`, then open the acceptance URL in the in-app browser.

- [ ] **Step 7: Verify Camera Wall before focus**

Require four visible canvases, each 480x360, status `Receiving 4 Master cameras`, moving timestamps, and no browser console errors.

- [ ] **Step 8: Select Front Right and verify exclusive raw H.264 focus**

Require one visible 2064x1552 canvas, label `Front Right · 2064x1552 raw → H.264`, `decoding` state, measured playback FPS, no `/robot` camera WebSocket for this selection, one `/h264/front-right` WebSocket, no black frame, and no console errors.

- [ ] **Step 9: Compare raw H.264 detail against the matched JPEG**

Capture a local H.264 screenshot and compare a fixed center crop with the saved raw PNG and 111 KB JPEG. The H.264 crop must retain substantially more fine detail than the JPEG without a large color or orientation mismatch.

- [ ] **Step 10: Return to Camera Wall and verify restoration**

Require the H.264 WebSocket and decoder to close, four JPEG subscriptions to return, four 480x360 canvases to update, and relay health to show zero H.264 viewers.

- [ ] **Step 11: Leave the local page open for user review and report measured facts**

Keep the acceptance tab as deliverable. Report resolution, source FPS, encoded FPS, browser playback FPS, bitrate, latency estimate, and whether hardware decode was selected. Do not claim 30 FPS unless measured playback reaches it.

- [ ] **Step 12: Keep production untouched and document rollback commands**

Confirm port 4175 task state and health match the pre-deployment evidence. Document the exact commands to stop the robot H.264 service, restore the preview relay backups, and restart only port 4173.
