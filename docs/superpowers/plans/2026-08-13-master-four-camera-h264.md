# Master Four-Camera H.264 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the active Master website camera pipeline with four H.264 streams in Camera Wall and one native-resolution H.264 stream in Focus View, with no JPEG subscription or fallback.

**Architecture:** A mode-aware service on Master subscribes to the four raw ROS 2 images and uses NVIDIA H.264 hardware encoders. AGENTECH01 port 4175 owns the single multiplexed robot connection, port 4173 proxies local preview traffic through 4175, and one Go LiveKit participant publishes four named pre-encoded H.264 tracks in wall mode or one selected track in focus mode. The website uses WebCodecs only for the private local preview and standard LiveKit video tracks on the production site.

**Tech Stack:** Python 3/rclpy/GStreamer/NVIDIA `nvv4l2h264enc`, Node.js `ws`, Go 1.26, LiveKit Go SDK v2.18.1, Pion H.264/RTCP, Next.js 15, React 19, TypeScript 5.8, LiveKit Client 2.20.

## Repository roots

- Website: `C:/Users/victo/OneDrive/Documents/ChatGPT/Main Site/mcam`
- SDK worktree: `C:/Users/victo/OneDrive/Documents/ChatGPT/Main Site/mcam/.codex-runtime/agentech_sdk_main`
- Master Robot Vision app, relative to SDK root: `agentech/robots/master/master vision app`

## Global constraints

- Master camera IDs are exactly `front-main`, `front-left`, `front-right`, and `rgbd-color`.
- Rear View, Depth Map, and LiDAR are excluded.
- Wall mode activates four H.264 profiles, each no larger than 1920x1080 and targeting 30 FPS without exceeding source cadence.
- Focus mode activates one selected camera at validated native resolution and stops the other three raw subscriptions, encoders, transport streams, and LiveKit tracks.
- Sources smaller than 1920x1080 are not upscaled or falsely labeled as 1080p.
- The active Master website pipeline contains no `/compressed`, `/agentech/web`, JPEG decoder, canvas re-encode, or JPEG fallback.
- Vendor compressed-image publishers remain installed for Master Robot Vision diagnostics, but the website H.264 path never subscribes to them.
- AGENTECH01 forwards Annex B H.264 without decoding, resizing, or transcoding.
- LiveKit uses one gateway participant with four named tracks in wall mode and one named track in focus mode.
- Queues remain latest-frame-only or strictly bounded; the system drops stale frames rather than accumulating latency.
- Measured resolution and FPS remain distinct from configured targets.
- Aegis, Navi, motion services, and SDK command behavior are unchanged.
- No robot password, relay token, LiveKit secret, or Vercel secret is committed.
- Every production-code change follows red-green-refactor and is committed independently.

## Reference APIs fixed for this plan

- LiveKit Go SDK v2.18.1 provides `NewLocalSampleTrack`, `LocalTrack.WriteSample`, `WithRTCPHandler`, and `ConnectToRoomWithToken`.
- Pion `media.Sample` carries each complete Annex B access unit and its source timestamp-derived duration.
- Pion RTCP `PictureLossIndication` and `FullIntraRequest` trigger a robot keyframe request.

---

### Task 1: Versioned multi-camera H.264 envelope

**Files:**
- Create: `agentech/robots/master/master vision app/robot/master_h264_protocol.py`
- Create: `agentech/robots/master/master vision app/robot/master_h264_protocol_test.py`
- Keep temporarily: `agentech/robots/master/master vision app/robot/front_right_h264_protocol.py`

**Interfaces:**
- Produces: `encode_access_unit(camera_id: str, generation: int, sequence: int, timestamp_us: int, width: int, height: int, keyframe: bool, payload: bytes) -> bytes`
- Produces: `decode_envelope(packet: bytes) -> AccessUnitEnvelope`
- Wire header: `struct.Struct(">4sBBBBIIQHHI")`, 32 bytes, magic `AH26`, version `2`.
- Camera codes: Front Main `1`, Front Left `2`, Front Right `3`, RGB-D Color `4`.

- [ ] **Step 1: Write the failing Python protocol tests**

```python
class MasterH264ProtocolTest(unittest.TestCase):
    def test_round_trip_preserves_camera_generation_and_frame_fields(self):
        packet = encode_access_unit(
            camera_id="front-left",
            generation=7,
            sequence=11,
            timestamp_us=123_456,
            width=1436,
            height=1080,
            keyframe=True,
            payload=b"\x00\x00\x00\x01\x65abc",
        )
        frame = decode_envelope(packet)
        self.assertEqual(frame.camera_id, "front-left")
        self.assertEqual(frame.generation, 7)
        self.assertEqual(frame.sequence, 11)
        self.assertEqual(frame.timestamp_us, 123_456)
        self.assertEqual((frame.width, frame.height), (1436, 1080))
        self.assertTrue(frame.keyframe)
        self.assertEqual(frame.payload, b"\x00\x00\x00\x01\x65abc")

    def test_rejects_unknown_camera_and_oversized_payload(self):
        with self.assertRaisesRegex(ValueError, "unknown camera"):
            encode_access_unit("rear", 1, 1, 1, 640, 480, True, b"x")
        with self.assertRaisesRegex(ValueError, "payload"):
            encode_access_unit("front-main", 1, 1, 1, 640, 480, True, b"")
```

- [ ] **Step 2: Run the tests and verify RED**

Run from the Master Robot Vision app:

```powershell
python -m unittest robot.master_h264_protocol_test -v
```

Expected: import failure because `master_h264_protocol.py` does not exist.

- [ ] **Step 3: Implement the protocol and strict validation**

```python
HEADER = struct.Struct(">4sBBBBIIQHHI")
MAGIC = b"AH26"
VERSION = 2
MAX_PAYLOAD_BYTES = 8 * 1024 * 1024
CAMERA_CODES = {"front-main": 1, "front-left": 2, "front-right": 3, "rgbd-color": 4}
CAMERA_IDS = {value: key for key, value in CAMERA_CODES.items()}

@dataclass(frozen=True)
class AccessUnitEnvelope:
    camera_id: str
    generation: int
    sequence: int
    timestamp_us: int
    width: int
    height: int
    keyframe: bool
    payload: bytes
```

`decode_envelope` must reject wrong magic/version/header length, unknown flags or camera codes, zero generation, dimensions outside `1..8192`, payload outside `1..8 MiB`, and packets whose total byte length is not exactly `HEADER.size + payload_length`.

- [ ] **Step 4: Run the protocol tests and verify GREEN**

```powershell
python -m unittest robot.master_h264_protocol_test -v
```

Expected: all protocol tests pass.

- [ ] **Step 5: Commit the protocol**

```powershell
git add -- 'agentech/robots/master/master vision app/robot/master_h264_protocol.py' 'agentech/robots/master/master vision app/robot/master_h264_protocol_test.py'
git commit -m "feat: define multi-camera H264 envelope"
```

### Task 2: Camera profiles and atomic mode planning

**Files:**
- Create: `agentech/robots/master/master vision app/robot/master_h264_profiles.py`
- Create: `agentech/robots/master/master vision app/robot/master_h264_profiles_test.py`

**Interfaces:**
- Produces: `CameraSource(camera_id, topic, width, height, encoding, step)`.
- Produces: `EncoderProfile(camera_id, topic, source_width, source_height, output_width, output_height, encoding, target_fps, bitrate, native)`.
- Produces: `fit_within_even(width: int, height: int, max_width: int, max_height: int) -> tuple[int, int]`.
- Produces: `build_profiles(selection: ViewSelection, sources: Mapping[str, CameraSource]) -> tuple[EncoderProfile, ...]`.

- [ ] **Step 1: Write failing profile tests with hand-derived dimensions**

```python
def test_wall_fits_large_source_without_stretching_and_keeps_small_native(self):
    sources = {
        "front-main": CameraSource("front-main", FRONT_MAIN_TOPIC, 1920, 1080, "rgb8", 5760),
        "front-left": CameraSource("front-left", FRONT_LEFT_TOPIC, 2064, 1552, "rgb8", 6192),
        "front-right": CameraSource("front-right", FRONT_RIGHT_TOPIC, 2064, 1552, "rgb8", 6192),
        "rgbd-color": CameraSource("rgbd-color", RGBD_COLOR_TOPIC, 640, 480, "rgb8", 1920),
    }
    profiles = build_profiles(ViewSelection.wall(), sources)
    self.assertEqual([p.camera_id for p in profiles], ALL_CAMERA_IDS)
    self.assertEqual((profiles[1].output_width, profiles[1].output_height), (1436, 1080))
    self.assertEqual((profiles[3].output_width, profiles[3].output_height), (640, 480))
    self.assertTrue(all(p.target_fps == 30 for p in profiles))

def test_focus_returns_only_selected_native_profile(self):
    profiles = build_profiles(ViewSelection.focus("front-right"), sources)
    self.assertEqual(len(profiles), 1)
    self.assertEqual((profiles[0].output_width, profiles[0].output_height), (2064, 1552))
    self.assertTrue(profiles[0].native)
```

Also test rejection of Rear, zero dimensions, unsupported encodings, and a missing selected source.

- [ ] **Step 2: Run the tests and verify RED**

```powershell
python -m unittest robot.master_h264_profiles_test -v
```

Expected: import failure for `master_h264_profiles`.

- [ ] **Step 3: Implement camera constants, aspect-fit math, and mode validation**

Use the four exact raw topics from the design. `fit_within_even` calculates `scale = min(1.0, max_width / width, max_height / height)`, floors both scaled dimensions to even integers, and never enlarges a source. `ViewSelection.focus` raises `ValueError("unknown Master camera")` for any ID outside the four-camera allowlist.

- [ ] **Step 4: Run profile tests and verify GREEN**

```powershell
python -m unittest robot.master_h264_profiles_test -v
```

Expected: all profile tests pass.

- [ ] **Step 5: Commit profile planning**

```powershell
git add -- 'agentech/robots/master/master vision app/robot/master_h264_profiles.py' 'agentech/robots/master/master vision app/robot/master_h264_profiles_test.py'
git commit -m "feat: plan Master H264 camera profiles"
```

### Task 3: Multi-camera encoder manager and bounded frame flow

**Files:**
- Create: `agentech/robots/master/master vision app/robot/master_h264_manager.py`
- Create: `agentech/robots/master/master vision app/robot/master_h264_manager_test.py`
- Reuse behavior from: `agentech/robots/master/master vision app/robot/front_right_h264_encoder.py`

**Interfaces:**
- Produces: `pipeline_description(profile: EncoderProfile) -> str`.
- Produces: `LatestFrameGate.offer/take/close` and per-camera `H264PacketGate.offer/take`.
- Produces: `MasterH264Manager.apply(selection: ViewSelection) -> ManagerSnapshot`.
- Consumes: injected `encoder_factory(profile, generation, packet_sink) -> EncoderWorker` so mode logic is tested without ROS or GStreamer.

- [ ] **Step 1: Write failing manager tests**

```python
def test_wall_starts_four_workers_and_focus_replaces_them_with_one(self):
    factory = FakeEncoderFactory(SOURCES)
    manager = MasterH264Manager(factory, SOURCES)
    wall = manager.apply(ViewSelection.wall())
    self.assertEqual(set(wall.active_camera_ids), set(ALL_CAMERA_IDS))
    focused = manager.apply(ViewSelection.focus("front-left"))
    self.assertEqual(focused.active_camera_ids, ("front-left",))
    self.assertEqual(factory.stopped_camera_ids, set(ALL_CAMERA_IDS))
    self.assertGreater(focused.generation, wall.generation)

def test_pipeline_is_hardware_h264_with_bounded_queues_and_no_jpeg(self):
    text = pipeline_description(FRONT_RIGHT_WALL_PROFILE)
    self.assertIn("nvv4l2h264enc", text)
    self.assertIn("max-size-buffers=1", text)
    self.assertIn("leaky=downstream", text)
    self.assertIn("num-B-Frames=0", text)
    self.assertIn("stream-format=byte-stream", text)
    self.assertNotIn("jpeg", text.lower())
```

Add tests proving idempotent repeated selection does not restart workers, partial startup failure stops every worker from the attempted generation, and a blocked camera packet gate waits for a keyframe after dropping deltas.

- [ ] **Step 2: Run the tests and verify RED**

```powershell
python -m unittest robot.master_h264_manager_test -v
```

Expected: import failure for `master_h264_manager`.

- [ ] **Step 3: Implement the manager and encoder worker**

The real `EncoderWorker` must:

- create one best-effort, keep-last-depth-1 ROS subscription;
- learn and validate width, height, encoding, and step from the first raw frame;
- repack padded rows only when `message.step != width * bytes_per_pixel`;
- feed at most the newest frame to `appsrc`;
- use source timestamps, not wall-clock duplication;
- emit complete Annex B access units through `encode_access_unit`;
- expose source FPS, encoded FPS, bytes per second, dropped raw frames, dimensions, generation, and last-frame time;
- stop the subscription, feeder, pipeline, and sender before `apply` reports a mode change complete.

Use `videoconvert -> RGBA -> nvvidconv -> NV12` initially because it is already proven on the robot. Hardware acceptance later records whether direct `nvvidconv` ingestion is supported and removes `videoconvert` only after an A/B FPS test.

- [ ] **Step 4: Run all robot unit tests and verify GREEN**

```powershell
python -m unittest discover -s robot -p '*_test.py' -v
```

Expected: all Python protocol, profile, manager, and legacy Front Right tests pass.

- [ ] **Step 5: Commit the manager**

```powershell
git add -- 'agentech/robots/master/master vision app/robot/master_h264_manager.py' 'agentech/robots/master/master vision app/robot/master_h264_manager_test.py'
git commit -m "feat: manage four Master H264 encoders"
```

### Task 4: Authenticated robot media/control service

**Files:**
- Create: `agentech/robots/master/master vision app/robot/master_h264_service.py`
- Create: `agentech/robots/master/master vision app/robot/master_h264_service_test.py`
- Create: `agentech/robots/master/master vision app/robot/agentech-master-h264.service`

**Interfaces:**
- Media TCP: robot private address port `22164`, one AGENTECH01 client, multiplexed version-2 envelopes.
- Control TCP: robot private address port `22165`, newline-delimited JSON authenticated by `AGENTECH_MASTER_H264_CONTROL_TOKEN_FILE`.
- Control request fields: a UUID `requestId`, the token read from the configured token file, `command: "select"`, and either `{mode: "wall"}` or a validated focus selection.
- Keyframe request fields: UUID `requestId`, file-backed token, `command: "keyframe"`, and an allowlisted `cameraId`.
- Health request fields: UUID `requestId`, file-backed token, and `command: "health"`.

- [ ] **Step 1: Write failing loopback service tests**

Use real loopback sockets and an injected fake manager. Assert that a correct token changes `wall -> focus:front-right`, a wrong token returns `{"ok":false,"error":"unauthorized"}` without changing mode, Rear is rejected, a keyframe request reaches only the selected worker, and two media clients cannot connect simultaneously.

- [ ] **Step 2: Run the service test and verify RED**

```powershell
python -m unittest robot.master_h264_service_test -v
```

Expected: import failure for `master_h264_service`.

- [ ] **Step 3: Implement strict JSON framing, authentication, health, and graceful shutdown**

Limit each control line to 16 KiB, compare tokens with `hmac.compare_digest`, bind only to the configured private robot address, set TCP_NODELAY, and reject a second media connection with a clean close. Do not log tokens or request bodies.

The systemd unit runs idle after boot and has:

```ini
[Service]
ExecStart=/usr/bin/python3 /opt/agentech/master-h264/master_h264_service.py
Environment=AGENTECH_H264_BIND_HOST=192.168.4.114
Environment=AGENTECH_H264_MEDIA_PORT=22164
Environment=AGENTECH_H264_CONTROL_PORT=22165
Environment=AGENTECH_MASTER_H264_CONTROL_TOKEN_FILE=/etc/agentech/master-h264-control-token
Restart=on-failure
RestartSec=2
```

- [ ] **Step 4: Run all Python tests and verify GREEN**

```powershell
python -m unittest discover -s robot -p '*_test.py' -v
```

Expected: all Python tests pass without importing ROS/GStreamer in unit tests.

- [ ] **Step 5: Commit the robot service**

```powershell
git add -- 'agentech/robots/master/master vision app/robot/master_h264_service.py' 'agentech/robots/master/master vision app/robot/master_h264_service_test.py' 'agentech/robots/master/master vision app/robot/agentech-master-h264.service'
git commit -m "feat: serve authenticated Master H264 media"
```

### Task 5: AGENTECH01 primary relay, preview proxy, and mode priority

**Files:**
- Create: `agentech/robots/master/master vision app/server/master-h264-protocol.cjs`
- Create: `agentech/robots/master/master vision app/server/master-h264-protocol.test.cjs`
- Create: `agentech/robots/master/master vision app/server/master-h264-upstream.cjs`
- Create: `agentech/robots/master/master vision app/server/master-h264-upstream.test.cjs`
- Create: `agentech/robots/master/master vision app/server/master-h264-mode.cjs`
- Create: `agentech/robots/master/master vision app/server/master-h264-mode.test.cjs`
- Modify: `agentech/robots/master/master vision app/server/share-server.cjs`
- Modify: `agentech/robots/master/master vision app/server/share-server.test.cjs`
- Create: `agentech/robots/master/master vision app/server/start-master-h264-preview.ps1`
- Delete after migration passes: `agentech/robots/master/master vision app/server/start-front-right-h264-preview.ps1`
- Delete after migration passes: `server/front-right-h264-protocol.cjs`, `server/front-right-h264-upstream.cjs`, and their tests.

**Interfaces:**
- Primary role: port 4175 owns one TCP connection to robot port 22164 and one authenticated control connection to 22165.
- Preview role: port 4173 proxies H.264 through `ws://127.0.0.1:4175`, never directly to the robot.
- Browser/gateway endpoints: `/h264/<camera-id>?scope=preview|production&mode=wall|focus`.
- Health: `/health` includes `h264.mode`, `h264.generation`, and per-camera source/forwarded FPS, bitrate, viewers, last frame, and waiting-for-keyframe.

- [ ] **Step 1: Write failing Node tests for protocol parity and mode priority**

```javascript
test("parser demultiplexes a split v2 envelope", () => {
  const parser = new H264EnvelopeParser();
  const wire = fixtureEnvelope({ cameraId: "rgbd-color", generation: 9, sequence: 2 });
  assert.deepEqual(parser.push(wire.subarray(0, 17)), []);
  const [frame] = parser.push(wire.subarray(17));
  assert.equal(frame.cameraId, "rgbd-color");
  assert.equal(frame.generation, 9);
  assert.equal(frame.sequence, 2);
});

test("production mode overrides preview and expiry restores preview", () => {
  const modes = createModeCoordinator({ now: () => 1000 });
  modes.setPreview({ mode: "focus", cameraId: "front-left" });
  modes.setProduction({ mode: "wall" }, 2000);
  assert.deepEqual(modes.current(), { mode: "wall" });
  modes.expire(2001);
  assert.deepEqual(modes.current(), { mode: "focus", cameraId: "front-left" });
});
```

Add a real `net.Server` test proving one robot connection fans different camera envelopes to the correct WebSocket clients and a slow client cannot delay a fast client.

- [ ] **Step 2: Run the server tests and verify RED**

```powershell
npm test -- server/master-h264-protocol.test.cjs server/master-h264-upstream.test.cjs server/master-h264-mode.test.cjs server/share-server.test.cjs
```

Expected: module-not-found failures for the generic H.264 modules.

- [ ] **Step 3: Implement generic demultiplexing and primary/preview roles**

The primary upstream holds a per-camera latest/keyframe gate. A generation change clears that camera's pending frame and forces every viewer to wait for an IDR. The preview relay rewrites nothing in the envelope; it forwards the exact binary message received from 4175.

The mode coordinator sends a robot control request only when the effective selection changes. An unexpired production selection wins; otherwise preview selection wins; otherwise the manager is stopped. Port 4173 continues to bind loopback and launches hidden, matching the user's existing blue/hidden access preference.

- [ ] **Step 4: Run the full Master Robot Vision Node suite and build**

```powershell
npm test
npm run build
```

Expected: all tests and the Vite build pass.

- [ ] **Step 5: Commit the generic relay**

```powershell
git add -- 'agentech/robots/master/master vision app/server'
git commit -m "feat: relay four Master H264 cameras"
```

### Task 6: Local website uses H.264 for all four cameras

**Files:**
- Modify: `lib/master-live-camera.ts`
- Create: `lib/master-h264-view-plan.ts`
- Create: `scripts/master-h264-view-plan.test.mjs`
- Modify: `features/eaic/05-delivery/live-results/components/master-h264-preview.mjs`
- Modify: `features/eaic/05-delivery/live-results/components/master-h264-preview.d.mts`
- Create: `scripts/master-h264-preview.test.mjs`
- Modify: `features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx`
- Modify: `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`
- Modify: `scripts/master-live-camera.test.mjs`
- Modify: `scripts/master-live-camera-ui.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Camera config fields: `id`, `label`, `trackName`, `previewPath`, `wallResolution`, `focusResolution`, `targetFrameRate`.
- Produces: `planMasterH264Views(selection) -> readonly {cameraId, trackName, previewPath, mode}[]`.
- Produces: `getMasterH264PreviewUrl(relayUrl, cameraId, mode) -> string`.
- Decoder consumes version-2 envelopes and calls `onState` with camera ID, generation, actual dimensions, codec, measured FPS, bytes per second, phase, and error.

- [ ] **Step 1: Replace old expectations with failing H.264 behavior tests**

```javascript
test("wall plans exactly four H264 endpoints and focus plans only one", () => {
  assert.deepEqual(planMasterH264Views({ mode: "wall" }).map((v) => v.previewPath), [
    "/h264/front-main", "/h264/front-left", "/h264/front-right", "/h264/rgbd-color",
  ]);
  assert.deepEqual(planMasterH264Views({ mode: "focus", cameraId: "front-left" }), [{
    cameraId: "front-left",
    trackName: "master-front-left",
    previewPath: "/h264/front-left",
    mode: "focus",
  }]);
});

test("preview URL carries camera and exclusive mode", () => {
  assert.equal(
    getMasterH264PreviewUrl("ws://127.0.0.1:4173/robot", "front-main", "focus"),
    "ws://127.0.0.1:4173/h264/front-main?scope=preview&mode=focus",
  );
});
```

The decoder test injects real fakes for `WebSocket`, `VideoDecoder`, and `EncodedVideoChunk`, sends a hand-built version-2 keyframe, and asserts the decoder receives the H.264 payload with the envelope removed. It then sends a new generation and asserts the old decoder is flushed before deltas are accepted.

- [ ] **Step 2: Run website camera tests and verify RED**

```powershell
npm run test:master-live-camera
```

Expected: failures because the config still exposes JPEG topics and the planner/decoder are Front-Right-specific.

- [ ] **Step 3: Implement H.264-only camera config, planner, decoder, and four-canvas preview**

Remove Foxglove ROS parsing, `CompressedImage`, `createImageBitmap`, JPEG MIME handling, `resolveMasterCameraStream`, and `/robot` camera subscriptions from `MasterDirectCameraWall`. In wall mode start four independent H.264 decoders. In focus mode start exactly one. Visibility cleanup closes every active WebSocket and decoder.

Labels begin as `up to 1920x1080 · target 30 FPS` in wall and `native resolution · target 30 FPS` in focus, then switch to measured values after decoded frames arrive. RGB-D is never labeled 1080p unless its encoded envelope actually reports 1920x1080.

- [ ] **Step 4: Run tests, typecheck, and build**

```powershell
npm run test:master-live-camera
npm run typecheck
npm run build
```

Expected: all commands pass and no active Master camera mapping contains a JPEG or ROS compressed topic.

- [ ] **Step 5: Commit the local H.264 wall**

```powershell
git add -- package.json lib/master-live-camera.ts lib/master-h264-view-plan.ts scripts/master-h264-view-plan.test.mjs scripts/master-h264-preview.test.mjs scripts/master-live-camera.test.mjs scripts/master-live-camera-ui.test.mjs 'features/eaic/05-delivery/live-results/components/master-h264-preview.mjs' 'features/eaic/05-delivery/live-results/components/master-h264-preview.d.mts' 'features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx' 'features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx'
git commit -m "feat: show all Master cameras over H264"
```

### Task 7: Go gateway transport and track planning

**Files:**
- Create: `agentech/robots/master/master vision app/gateway-h264/go.mod`
- Create: `agentech/robots/master/master vision app/gateway-h264/go.sum`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/envelope/envelope.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/envelope/envelope_test.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/plan/plan.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/plan/plan_test.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/relay/client.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/relay/client_test.go`

**Interfaces:**
- Module: `agentech/master-h264-gateway`, Go `1.26`.
- Dependencies: `github.com/livekit/server-sdk-go/v2 v2.18.1`, `github.com/gorilla/websocket v1.5.3`, `github.com/gofrs/flock v0.13.0`.
- Produces: `envelope.Decode([]byte) (AccessUnit, error)` with the same camera/generation fields as Python and Node.
- Produces: `plan.ForSelection(Selection) []TrackSpec`, using track names `master-front-main`, `master-front-left`, `master-front-right`, `master-rgbd-color`.
- Produces: `relay.Client.Stream(ctx, cameraID, mode) <-chan envelope.AccessUnit`.

- [ ] **Step 1: Add the pinned portable Go toolchain for execution only**

Download `https://go.dev/dl/go1.26.0.windows-amd64.zip` into `.codex-runtime`, verify its published SHA256 from `https://go.dev/dl/?mode=json`, and use its `go.exe`. Do not commit the toolchain.

- [ ] **Step 2: Write failing Go parser/planner/client tests**

```go
func TestWallHasFourDistinctTracksFromOnePlan(t *testing.T) {
    got, err := plan.ForSelection(plan.Selection{Mode: "wall"})
    require.NoError(t, err)
    require.Equal(t, []string{
        "master-front-main", "master-front-left", "master-front-right", "master-rgbd-color",
    }, trackNames(got))
}

func TestFocusHasOnlySelectedTrack(t *testing.T) {
    got, err := plan.ForSelection(plan.Selection{Mode: "focus", CameraID: "front-right"})
    require.NoError(t, err)
    require.Equal(t, []string{"master-front-right"}, trackNames(got))
}
```

The relay test uses `httptest.Server` plus a real WebSocket upgrade, sends a Python-compatible literal envelope, and asserts payload, timestamp, generation, and camera ID.

- [ ] **Step 3: Run Go tests and verify RED**

```powershell
go test ./...
```

Expected: package-not-found/build failures before the implementation files exist.

- [ ] **Step 4: Implement strict decoding, track planning, and reconnecting relay client**

The client connects only to loopback port 4175, requests `scope=production`, requires a keyframe after every reconnect/generation change, and uses a channel capacity of one. Offering a second unread delta replaces the older delta; dropping continuity clears the slot and waits for an IDR.

- [ ] **Step 5: Run Go tests and verify GREEN**

```powershell
go test -race ./...
```

Expected: all Go tests pass under the race detector.

- [ ] **Step 6: Commit the gateway foundation**

```powershell
git add -- 'agentech/robots/master/master vision app/gateway-h264'
git commit -m "feat: add Master H264 gateway transport"
```

### Task 8: One-participant LiveKit H.264 publisher and session controller

**Files:**
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/state/client.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/state/client_test.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/publisher/publisher.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/publisher/publisher_test.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/controller/controller.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/internal/controller/controller_test.go`
- Create: `agentech/robots/master/master vision app/gateway-h264/cmd/master-h264-gateway/main.go`

**Interfaces:**
- `state.Client.Get(ctx) -> GatewayState` reads the existing authenticated Vercel gateway endpoint and validates active session, expiry, LiveKit URL/token, and selection.
- `publisher.Room` is one `ConnectToRoomWithToken` connection for the session.
- `publisher.TrackWriter.Write(AccessUnit) error` writes `media.Sample{Data, Timestamp, Duration}` to one `LocalSampleTrack`.
- `controller.Reconcile(GatewayState)` connects once, publishes/unpublishes the exact track plan, and sends the production mode intent to AGENTECH01 4175.

- [ ] **Step 1: Write failing controller tests against a narrow room adapter**

```go
func TestWallUsesOneRoomAndFourNamedTracks(t *testing.T) {
    room := newRecordingRoom()
    controller := New(room, fakeRelay(), fakeModeClient())
    require.NoError(t, controller.Reconcile(activeState("wall", "")))
    require.Equal(t, 1, room.ConnectCount())
    require.ElementsMatch(t, []string{
        "master-front-main", "master-front-left", "master-front-right", "master-rgbd-color",
    }, room.PublishedNames())
}

func TestFocusUnpublishesThreeAndKeepsOnlySelectedNativeStream(t *testing.T) {
    room := newRecordingRoom()
    controller := New(room, fakeRelay(), fakeModeClient())
    require.NoError(t, controller.Reconcile(activeState("wall", "")))
    require.NoError(t, controller.Reconcile(activeState("focus", "front-left")))
    require.Equal(t, []string{"master-front-left"}, room.PublishedNames())
    require.Equal(t, 1, room.ConnectCount())
}
```

Add tests for expired session disconnect, token refresh without duplicate connection, second-process lock rejection, timestamp-derived sample duration clamped to `1..100 ms`, and RTCP PLI/FIR calling the keyframe control endpoint for the correct camera.

- [ ] **Step 2: Run Go tests and verify RED**

```powershell
go test ./internal/state ./internal/publisher ./internal/controller
```

Expected: package-not-found failures.

- [ ] **Step 3: Implement the LiveKit adapter using pre-encoded samples**

For each active camera:

```go
track, err := lksdk.NewLocalSampleTrack(
    webrtc.RTPCodecCapability{MimeType: webrtc.MimeTypeH264, ClockRate: 90000},
    lksdk.WithRTCPHandler(handleRTCP(cameraID)),
)
publication, err := room.LocalParticipant.PublishTrack(track, &lksdk.TrackPublicationOptions{
    Name: trackName,
    Source: livekit.TrackSource_CAMERA,
    VideoWidth: width,
    VideoHeight: height,
})
err = track.WriteSample(media.Sample{
    Data: accessUnit.Payload,
    Timestamp: time.UnixMicro(int64(accessUnit.TimestampUS)),
    Duration: durationFromTimestamps(previous, accessUnit.TimestampUS),
}, nil)
```

The code must use the actual v2.18.1 signatures from the pinned module; `go test` is the interface check. No H.264 payload is decoded or re-encoded. On generation change, unpublish/close the old track, request a keyframe, and publish a fresh track after the first IDR provides actual dimensions.

- [ ] **Step 4: Implement the five-second state loop and single-process lock**

Use `gofrs/flock` on `%ProgramData%/Agentech/master-h264-gateway.lock`. The process sends a production selection with the gateway secret to `http://127.0.0.1:4175/h264/control`, starts streams only for an active unexpired Master session, and closes all tracks and the room within five seconds of session expiry.

- [ ] **Step 5: Run Go tests and build the Windows binary**

```powershell
go test -race ./...
go build -trimpath -o dist/master-h264-gateway.exe ./cmd/master-h264-gateway
```

Expected: tests pass and the binary builds without CGO.

- [ ] **Step 6: Commit the publisher/controller**

```powershell
git add -- 'agentech/robots/master/master vision app/gateway-h264'
git commit -m "feat: publish Master H264 tracks to LiveKit"
```

### Task 9: Production website renders four named tracks or one focus track

**Files:**
- Create: `features/eaic/05-delivery/live-results/components/master-livekit-camera-grid.tsx`
- Create: `features/eaic/05-delivery/live-results/components/master-livekit-video-tile.tsx`
- Create: `lib/master-livekit-track-state.ts`
- Create: `scripts/master-livekit-track-state.test.mjs`
- Modify: `features/eaic/05-delivery/live-results/components/live-robot-camera.tsx`
- Modify: `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`
- Modify: `scripts/master-live-camera-ui.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `resolveMasterTrackLayout(selection, publications) -> four wall slots or one focus slot`.
- Produces: `desiredMasterTrackSubscriptions(selection, publications) -> {trackSid, subscribe}[]`, allowing all four named tracks in wall mode and only the selected named track in focus mode.
- `MasterLivekitCameraGrid` receives `selection`, `tracksByName`, and status callbacks.
- `MasterLivekitVideoTile` attaches one `RemoteVideoTrack`, sets playout delay to zero, and measures decoded width/height/FPS with `requestVideoFrameCallback`.
- Aegis/Navi continue using the existing single `videoRef` path.

- [ ] **Step 1: Write failing layout/state tests**

```javascript
test("wall maps four stable track names and focus ignores the other three", () => {
  const publications = fixturesForAllFourTracks();
  assert.deepEqual(resolveMasterTrackLayout({ mode: "wall" }, publications).map((x) => x.cameraId), [
    "front-main", "front-left", "front-right", "rgbd-color",
  ]);
  assert.deepEqual(
    resolveMasterTrackLayout({ mode: "focus", cameraId: "front-right" }, publications).map((x) => x.cameraId),
    ["front-right"],
  );
});

test("unknown and rear tracks never enter the Master layout", () => {
  const layout = resolveMasterTrackLayout({ mode: "wall" }, [rearFixture(), unknownFixture()]);
  assert.equal(layout.every((slot) => slot.track === null), true);
});

test("focus unsubscribes every non-selected Master track", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions({ mode: "focus", cameraId: "front-right" }, fixturesForAllFourTracks()),
    [
      { trackSid: "front-main-sid", subscribe: false },
      { trackSid: "front-left-sid", subscribe: false },
      { trackSid: "front-right-sid", subscribe: true },
      { trackSid: "rgbd-color-sid", subscribe: false },
    ],
  );
});
```

- [ ] **Step 2: Run UI tests and verify RED**

```powershell
npm run test:master-live-camera
```

Expected: missing `master-livekit-track-state` and the current Master path still has one video element.

- [ ] **Step 3: Implement a Master-only multi-track path**

Lift Master selection state into `LiveRobotCamera`, pass it to both controls and grid, and update it only from the validated API response. Apply `desiredMasterTrackSubscriptions` through each `RemoteTrackPublication.setSubscribed(...)` immediately after a selection change. Track subscribed/unsubscribed events update a `Map<string, RemoteTrack>`. The Master grid attaches one track per tile. The existing Aegis/Navi attach/capture logic and its single video element remain structurally unchanged.

`MasterLivekitVideoTile` displays measured values such as `1436x1080 · 27.8 FPS · H.264`; it never derives measured FPS from the `targetFrameRate` label.

- [ ] **Step 4: Run focused tests, full tests, typecheck, and build**

```powershell
npm run test:master-live-camera
npm test
npm run typecheck
npm run build
```

Expected: all commands pass. Existing Aegis and Navi wording/capture tests remain green.

- [ ] **Step 5: Commit production rendering**

```powershell
git add -- package.json lib/master-livekit-track-state.ts scripts/master-livekit-track-state.test.mjs scripts/master-live-camera-ui.test.mjs 'features/eaic/05-delivery/live-results/components/master-livekit-camera-grid.tsx' 'features/eaic/05-delivery/live-results/components/master-livekit-video-tile.tsx' 'features/eaic/05-delivery/live-results/components/live-robot-camera.tsx' 'features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx'
git commit -m "feat: render Master LiveKit H264 track grid"
```

### Task 10: Safe deployment, JPEG service retirement, and reboot recovery

**Files:**
- Create: `agentech/robots/master/master vision app/scripts/deploy-master-h264-robot.ps1`
- Create: `agentech/robots/master/master vision app/scripts/install-master-h264-gateway.ps1`
- Create: `agentech/robots/master/master vision app/scripts/verify-master-h264-services.ps1`
- Create: `agentech/robots/master/master vision app/scripts/deployment-scripts.test.mjs`
- Modify: `agentech/robots/master/master vision app/package.json`
- Modify: `docs/operations/master-livekit-production.md`

**Interfaces:**
- Robot deployment backs up and disables `agentech-front-right-h264.service`, installs the new files under `/opt/agentech/master-h264`, writes the token file mode `0600`, starts the new unit idle, and leaves motion services untouched.
- AGENTECH01 installation puts the Go binary/config under `%ProgramData%/Agentech/MasterH264`, updates 4175 as primary and 4173 as preview proxy, and creates one hidden scheduled task for the Go gateway.
- Verification returns nonzero unless listener ownership, relay roles, single gateway process, and health JSON all match.

- [ ] **Step 1: Write failing deployment behavior tests**

Run scripts with `-WhatIf`/`-PlanOnly` against temporary directories. Assert the emitted action plan contains only the new H.264 unit, `agentech-front-right-h264.service`, ports 22164/22165/4173/4175, hidden task launch, backup paths, and resolved service units whose `ExecStart` basename is exactly `master_camera_web_optimizer.py` or `master_camera_focus_service.py`. Assert it never contains motion, Aegis, Navi, Rear, a plaintext secret, or a destructive broad path.

- [ ] **Step 2: Run deployment tests and verify RED**

```powershell
node --test scripts/deployment-scripts.test.mjs
```

Expected: missing deployment scripts.

- [ ] **Step 3: Implement idempotent deployment and rollback**

The scripts resolve every target path before copying, use `Start-Process -WindowStyle Hidden` for AGENTECH01 background processes, preserve the current 4175 production service until health checks pass, and write timestamped backups. Before stopping legacy JPEG work, they enumerate systemd units and accept only units whose parsed `ExecStart` entrypoint basename is exactly `master_camera_web_optimizer.py` or `master_camera_focus_service.py`; the resolved unit list is printed and saved with the deployment evidence. Those units are stopped and disabled only after a five-minute four-camera H.264 capacity pass. Vendor camera publishers are never disabled.

- [ ] **Step 4: Run script tests and dry-run verification**

```powershell
npm test
powershell -File scripts/deploy-master-h264-robot.ps1 -PlanOnly
powershell -File scripts/install-master-h264-gateway.ps1 -PlanOnly
```

Expected: tests pass and dry runs list exact, bounded changes without modifying either machine.

- [ ] **Step 5: Commit deployment and operations docs**

```powershell
git add -- 'agentech/robots/master/master vision app/scripts' 'agentech/robots/master/master vision app/package.json'
git commit -m "ops: deploy Master H264 camera gateway"
```

In the website repository:

```powershell
git add -- docs/operations/master-livekit-production.md
git commit -m "docs: operate Master H264 live streaming"
```

### Task 11: Offline full-story verification before hardware changes

**Files:**
- Modify only if failures require a tested fix; do not add production behavior without a new failing test.

- [ ] **Step 1: Run the SDK Python and Node suites**

```powershell
python -m unittest discover -s robot -p '*_test.py' -v
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run Go race tests and reproducible build**

```powershell
go test -race ./...
go build -trimpath -o dist/master-h264-gateway.exe ./cmd/master-h264-gateway
```

Expected: all pass and one Windows gateway binary is produced.

- [ ] **Step 3: Run the full website suite**

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all pass with no new warnings.

- [ ] **Step 4: Inspect active contracts, not source-text absence alone**

Run the camera planner tests and relay integration fixture, then record their JSON outputs. Confirm wall returns four H.264 endpoints/tracks, each focus returns one, invalid IDs return errors, and Aegis/Navi session fixtures return their existing render modes.

- [ ] **Step 5: Record verification commits and hashes**

Save the website commit, SDK commit, Go binary SHA256, and test command results in the deployment evidence directory. Do not store environment variables or tokens.

### Task 12: Staged robot, local-preview, and production acceptance

**Files:**
- Create runtime evidence under the existing non-source `outputs/` or approved evidence directory; do not commit secrets or raw private video.

- [ ] **Step 1: Read-only baseline before deployment**

Record robot source formats/FPS for all four raw topics, CPU/memory/temperature/NVENC load, AGENTECH01 link rate, active JPEG services, and current 4173/4175 listener PIDs. Confirm the robot is stationary and do not touch motion services.

- [ ] **Step 2: Deploy the robot service disabled, then test cameras one at a time**

For each camera, run a 30-second native H.264 sample. Verify decodable frames, actual dimensions, source/encoded/received FPS, bitrate, keyframe interval, no black frames, and zero envelope sequence loss. Front Right must remain 2064x1552 if the raw topic still reports that format.

- [ ] **Step 3: Validate wall capacity before removing JPEG competition**

Run four wall profiles for five minutes, record per-camera FPS and load, then stop only the four web JPEG optimizers/focus service and repeat. Promote the H.264 path only if the second run is stable, latest-frame latency does not grow, and no source or encoder is thermally throttled. Keep measured results even if they are below 30 FPS.

- [ ] **Step 4: Deploy AGENTECH01 primary/preview roles and open the local site**

Verify 4175 owns one robot media connection, 4173 owns none, all four local tiles move, focus stops the other three streams, and returning to wall restores four streams. Measure browser FPS against relay FPS. Confirm no browser or relay subscribes to JPEG.

- [ ] **Step 5: Run LiveKit test-room acceptance**

Start one authorized Master test session. Confirm LiveKit shows one gateway participant, wall publishes four named tracks, focus publishes one selected track, participant count does not grow across five mode cycles, and main-site receiver FPS/dimensions match gateway telemetry within normal WebRTC variance.

- [ ] **Step 6: Verify session end and reboot recovery**

End the session and confirm all tracks, robot subscriptions, and encoders stop within five seconds. Reboot/restart AGENTECH01 services with Master available, schedule another test session, and confirm streaming starts without the developer laptop.

- [ ] **Step 7: Promote website and document final measured limits**

Deploy the tested website commit to production only after local and LiveKit acceptance. Record actual sustainable wall/focus FPS, resolution, bitrate, and robot load in `docs/operations/master-livekit-production.md`. If any camera cannot sustain its profile, keep the previous production deployment and the H.264 services disabled until a measured follow-up design is approved.
