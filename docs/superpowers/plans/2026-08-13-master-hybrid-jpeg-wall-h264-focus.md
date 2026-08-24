# Master Hybrid JPEG Wall and H.264 Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the existing JPEG-backed four-camera Master wall while switching every single-camera focus view to one native-resolution robot H.264 track with the other three camera subscriptions stopped.

**Architecture:** The website treats `master-program` as the only wall track and one `master-<camera>` track as the only focus track. The headless AGENTECH01 wall publisher owns LiveKit and ROS JPEG subscriptions only in wall mode; the Go H.264 gateway owns LiveKit and one raw robot encoder only in focus mode. Both consume the same scheduled-session selection but never publish simultaneously.

**Tech Stack:** Next.js 15, React 19, TypeScript, LiveKit Client 2.20, Vite/React Master Vision publisher, Foxglove ROS WebSocket, Go 1.26, LiveKit Go Server SDK, Python ROS 2/NVIDIA GStreamer robot encoder, Windows Scheduled Tasks.

## Global Constraints

- This change applies only to Master. Aegis and Navi behavior, rooms, publishers, and controls remain unchanged.
- Wall mode keeps the established compressed/JPEG four-camera program and publishes one `master-program` LiveKit track.
- Focus mode publishes exactly one of `master-front-main`, `master-front-left`, `master-front-right`, or `master-rgbd-color`.
- Front Main focus is 1920x1080; Front Left and Front Right are 2064x1552; RGB-D Color is 640x480.
- No focused camera is upscaled beyond its raw ROS source dimensions.
- Target frame rate is up to 30 FPS, but the UI reports measured FPS and does not promise 30 FPS.
- At most one Master publisher participant is active during steady wall or focus operation.
- No rear, depth, or LiDAR views are added.
- AGENTECH01 services continue to launch with hidden scheduled tasks.

---

### Task 1: Model the one-track hybrid subscription policy

**Files:**
- Modify: `lib/master-live-camera.ts`
- Modify: `lib/master-livekit-track-state.ts`
- Test: `scripts/master-livekit-track-state.test.mjs`
- Test: `scripts/master-live-camera.test.mjs`

**Interfaces:**
- Consumes: `MasterViewSelection` and the existing four `MASTER_LIVE_CAMERAS` definitions.
- Produces: `MASTER_WALL_TRACK_NAME`, `expectedMasterTrack(selection)`, `isApprovedMasterTrackName(trackName)`, `resolveMasterTrackLayout(selection, publications)`, and `desiredMasterTrackSubscriptions(selection, publications)`.

- [ ] **Step 1: Write failing hybrid track-policy tests**

Replace the four-H.264 wall fixtures with one wall publication plus four possible focus publications:

```js
function publicationsForHybridTracks() {
  return [
    { trackName: "master-program", trackSid: "wall-sid" },
    { trackName: "master-front-main", trackSid: "front-main-sid" },
    { trackName: "master-front-left", trackSid: "front-left-sid" },
    { trackName: "master-front-right", trackSid: "front-right-sid" },
    { trackName: "master-rgbd-color", trackSid: "rgbd-color-sid" },
  ];
}

test("wall subscribes only to the JPEG-backed master program", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions({ mode: "wall" }, publicationsForHybridTracks()),
    [
      { trackSid: "wall-sid", subscribe: true },
      { trackSid: "front-main-sid", subscribe: false },
      { trackSid: "front-left-sid", subscribe: false },
      { trackSid: "front-right-sid", subscribe: false },
      { trackSid: "rgbd-color-sid", subscribe: false },
    ],
  );
});

test("focus subscribes only to the selected native H264 track", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions(
      { mode: "focus", cameraId: "front-right" },
      publicationsForHybridTracks(),
    ),
    [
      { trackSid: "wall-sid", subscribe: false },
      { trackSid: "front-main-sid", subscribe: false },
      { trackSid: "front-left-sid", subscribe: false },
      { trackSid: "front-right-sid", subscribe: true },
      { trackSid: "rgbd-color-sid", subscribe: false },
    ],
  );
});

test("unexpected room tracks are explicitly unsubscribed", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions(
      { mode: "wall" },
      [{ trackName: "stale-master-track", trackSid: "stale-sid" }],
    ),
    [{ trackSid: "stale-sid", subscribe: false }],
  );
});
```

Add assertions that the camera configuration contains exact focus resolution strings `1920x1080`, `2064x1552`, and `640x480`, and identifies the wall as JPEG preview rather than four H.264 streams.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```powershell
npm run test:master-live-camera
```

Expected: FAIL because wall mode still subscribes to four native tracks and `master-program` is not approved.

- [ ] **Step 3: Implement the hybrid track domain model**

In `lib/master-live-camera.ts`, define exact native focus labels and the wall track:

```ts
export const MASTER_WALL_TRACK_NAME = "master-program" as const;

export const MASTER_LIVE_CAMERAS = [
  { id: "front-main", label: "Front Main", trackName: "master-front-main", focusResolution: "1920x1080 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
  { id: "front-left", label: "Front Left", trackName: "master-front-left", focusResolution: "2064x1552 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
  { id: "front-right", label: "Front Right", trackName: "master-front-right", focusResolution: "2064x1552 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
  { id: "rgbd-color", label: "RGB-D Color", trackName: "master-rgbd-color", focusResolution: "640x480 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
] as const;
```

Keep the existing `previewPath` fields required by the local direct H.264 preview. In `lib/master-livekit-track-state.ts`, make the selected track deterministic:

```ts
export function expectedMasterTrack(selection: MasterViewSelection) {
  if (selection.mode === "wall") {
    return { id: "wall" as const, label: "Camera Wall", trackName: MASTER_WALL_TRACK_NAME };
  }
  const camera = MASTER_LIVE_CAMERAS.find(({ id }) => id === selection.cameraId)!;
  return { id: camera.id, label: camera.label, trackName: camera.trackName };
}

export function isApprovedMasterTrackName(trackName: string) {
  return trackName === MASTER_WALL_TRACK_NAME
    || MASTER_LIVE_CAMERAS.some((camera) => camera.trackName === trackName);
}
```

Return one layout slot for the expected track and map every room publication to `subscribe: publication.trackName === expected.trackName`, including unknown tracks as `false`.

- [ ] **Step 4: Run the focused tests and confirm success**

Run:

```powershell
npm run test:master-live-camera
```

Expected: all Master camera policy tests PASS.

- [ ] **Step 5: Commit the website policy change**

```powershell
git add lib/master-live-camera.ts lib/master-livekit-track-state.ts scripts/master-livekit-track-state.test.mjs scripts/master-live-camera.test.mjs
git commit -m "feat: define hybrid Master camera track policy"
```

---

### Task 2: Render and transition between the wall and one focus track

**Files:**
- Modify: `features/eaic/05-delivery/live-results/components/live-robot-camera.tsx`
- Modify: `features/eaic/05-delivery/live-results/components/master-livekit-camera-grid.tsx`
- Modify: `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`
- Test: `scripts/master-live-camera-ui.test.mjs`

**Interfaces:**
- Consumes: `expectedMasterTrack`, `isApprovedMasterTrackName`, and `desiredMasterTrackSubscriptions` from Task 1.
- Produces: a one-tile `MasterLivekitCameraGrid`, explicit wall/focus status copy, and a 15-second missing-track error while keeping the Camera Wall button available.

- [ ] **Step 1: Write failing UI policy tests**

Update the UI source tests to require:

```js
test("production Master view switches between one JPEG wall track and one native H264 track", () => {
  assert.match(camera, /isApprovedMasterTrackName/);
  assert.match(camera, /desiredMasterTrackSubscriptions/);
  assert.match(camera, /Switching camera/);
  assert.match(camera, /Selected H\.264 camera did not arrive/);
  assert.match(grid, /resolveMasterTrackLayout/);
  assert.doesNotMatch(controls, /four hardware H\.264 streams/);
  assert.match(controls, /JPEG camera wall/);
  assert.match(controls, /Native H\.264/);
});
```

Keep the existing assertions that the shared Aegis/Navi `<video>` path and copy remain present.

- [ ] **Step 2: Run the UI test and confirm failure**

Run:

```powershell
node --test scripts/master-live-camera-ui.test.mjs
```

Expected: FAIL because the controls still describe a four-H.264 wall and the runtime rejects `master-program`.

- [ ] **Step 3: Render exactly the expected Master track**

Change `MasterLivekitCameraGrid` to render the single slot returned by `resolveMasterTrackLayout`:

```tsx
return (
  <div className="grid gap-2">
    {layout.map((slot) => (
      <MasterLivekitVideoTile
        key={slot.id}
        label={slot.label}
        track={slot.publication?.track ?? null}
      />
    ))}
  </div>
);
```

In `live-robot-camera.tsx`, accept `master-program` through `isApprovedMasterTrackName`, apply `setSubscribed(false)` to every non-expected publication, and set `Switching camera...` whenever an active Master selection changes.

Add an effect that checks `expectedMasterTrack(masterSelection).trackName` against `masterTracksByName`. When present, set `Live robot camera connected.` When absent for 15 seconds in an active viewed Master session, set `Selected H.264 camera did not arrive. Choose Camera Wall to retry.` for focus or `The JPEG camera wall did not arrive. Retry Camera Wall.` for wall. Clear the timer on track arrival, selection change, session end, or component unmount.

- [ ] **Step 4: Correct the Master control copy without touching Aegis/Navi**

Use these exact mode descriptions:

```tsx
{selection.mode === "wall"
  ? "JPEG camera wall · four camera views"
  : `${selectedCamera?.label} · ${selectedCamera?.focusResolution} · measured FPS shown below`}
```

Use `JPEG wall` for the wall badge and `Native H.264` for focus. Leave the local `masterCameraPreview=1` direct H.264 diagnostic wall unchanged.

- [ ] **Step 5: Run website unit, type, and lint checks**

Run:

```powershell
npm run test:master-live-camera
npm run typecheck
npm run lint -- --quiet
```

Expected: all commands exit 0; Aegis/Navi source-policy assertions still PASS.

- [ ] **Step 6: Commit the website hybrid UI**

```powershell
git add features/eaic/05-delivery/live-results/components/live-robot-camera.tsx features/eaic/05-delivery/live-results/components/master-livekit-camera-grid.tsx features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx scripts/master-live-camera-ui.test.mjs
git commit -m "feat: switch Master wall and focus tracks"
```

---

### Task 3: Make the JPEG wall publisher wall-only

**Files:**
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/lib/RobotConnection.js`
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/hooks/useRobotSensors.js`
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/lib/masterLivekitPublisher.js`
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/master-program/MasterProgram.jsx`
- Test: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/lib/RobotConnection.test.mjs`
- Test: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/lib/masterLivekitPublisher.test.mjs`
- Test: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/src/master-program/latest-frame.test.mjs`

**Interfaces:**
- Consumes: gateway state `{ active, sessionId, selection }` from `/gateway-state`.
- Produces: `RobotConnection.setSubscriptionsEnabled(enabled)` and `shouldPublishMasterWall(state)`, guaranteeing zero JPEG subscriptions and no `master-program` participant in focus mode.

- [ ] **Step 1: Write failing wall-ownership tests**

Change the existing `createConnection` helper to accept the initial subscription flag, then add this test with the existing `CHANNELS` fixture:

```js
function createConnection(subscriptionsEnabled = true) {
  const messages = [];
  const connection = new RobotConnection(
    "ws://relay/robot",
    {},
    MASTER_PROGRAM_CAMERAS,
    subscriptionsEnabled,
  );
  connection.socket = {
    readyState: WebSocket.OPEN,
    send(payload) { messages.push(JSON.parse(payload)); },
  };
  return { connection, messages };
}

test("disabled sensor subscriptions remain empty after advertise", () => {
  const { connection } = createConnection(false);
  connection.handleText({ op: "advertise", channels: CHANNELS });
  assert.equal(connection.subscriptions.size, 0);
  connection.setSubscriptionsEnabled(true);
  assert.equal(connection.subscriptions.size, 4);
  connection.setSubscriptionsEnabled(false);
  assert.equal(connection.subscriptions.size, 0);
});
```

Add these publisher assertions to `masterLivekitPublisher.test.mjs`:

```js
test("the canvas publisher owns only active wall sessions", () => {
  assert.equal(shouldPublishMasterWall({ active: true, selection: { mode: "wall" } }), true);
  assert.equal(shouldPublishMasterWall({ active: true, selection: { mode: "focus", cameraId: "front-right" } }), false);
  assert.equal(shouldPublishMasterWall({ active: false, selection: { mode: "wall" } }), false);
});
```

- [ ] **Step 2: Run the Master Vision tests and confirm failure**

Run from `agentech/robots/master/master vision app`:

```powershell
npm test
```

Expected: FAIL because subscriptions cannot be disabled and the publisher accepts focus sessions.

- [ ] **Step 3: Add bounded JPEG subscription ownership**

Add a constructor flag and setter to `RobotConnection`:

```js
constructor(url, callbacks, sensors = SENSORS, subscriptionsEnabled = true) {
  // existing initialization
  this.subscriptionsEnabled = Boolean(subscriptionsEnabled);
}

setSubscriptionsEnabled(enabled) {
  const next = Boolean(enabled);
  if (this.subscriptionsEnabled === next) return;
  this.subscriptionsEnabled = next;
  this.clearSubscriptionsAndPulses();
  if (next) this.startBaseSubscriptions();
}
```

Start `startBaseSubscriptions()` with `if (!this.subscriptionsEnabled) return;`. Update `useRobotSensors(url, sensors, subscriptionsEnabled = true)` to pass the initial value and call the setter from an effect when the value changes.

- [ ] **Step 4: Gate the wall publisher and canvas work**

Export and use:

```js
export function shouldPublishMasterWall(state) {
  return Boolean(state?.active && state.selection?.mode === "wall");
}
```

In `MasterProgram.jsx`, compute `wallActive = shouldPublishMasterWall(gateway)`, pass it as the sensor-subscription flag, start `startMasterPublisher` only when `wallActive`, draw only the four wall sources, and render no focused JPEG source. Make the publishing effect depend on `wallActive` and `gateway.sessionId` so focus immediately runs the publisher cleanup.

- [ ] **Step 5: Run Master Vision tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: tests PASS and Vite produces `dist/master-program/index.html` with no build errors.

- [ ] **Step 6: Commit the SDK wall-publisher change**

From `.codex-runtime/agentech_sdk_main`:

```powershell
git add -- 'agentech/robots/master/master vision app/src/lib/RobotConnection.js' 'agentech/robots/master/master vision app/src/hooks/useRobotSensors.js' 'agentech/robots/master/master vision app/src/lib/masterLivekitPublisher.js' 'agentech/robots/master/master vision app/src/master-program/MasterProgram.jsx' 'agentech/robots/master/master vision app/src/lib/RobotConnection.test.mjs' 'agentech/robots/master/master vision app/src/lib/masterLivekitPublisher.test.mjs' 'agentech/robots/master/master vision app/src/master-program/latest-frame.test.mjs'
git commit -m "feat: keep Master JPEG publisher in wall mode"
```

---

### Task 4: Make the native H.264 gateway focus-only

**Files:**
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/gateway-h264/internal/plan/plan.go`
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/gateway-h264/internal/plan/plan_test.go`
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/gateway-h264/internal/controller/controller.go`
- Modify: `.codex-runtime/agentech_sdk_main/agentech/robots/master/master vision app/gateway-h264/internal/controller/controller_test.go`

**Interfaces:**
- Consumes: server gateway state with `selection.mode` equal to `wall` or `focus`.
- Produces: zero H.264 tracks and a disconnected LiveKit room in wall mode; exactly one selected native H.264 track in focus mode.

- [ ] **Step 1: Write failing Go ownership tests**

Replace the wall plan expectation with:

```go
func TestWallSelectionProducesNoNativeTracks(t *testing.T) {
    got, err := ForSelection(Selection{Mode: "wall"})
    if err != nil {
        t.Fatal(err)
    }
    if len(got) != 0 {
        t.Fatalf("wall tracks = %v, want none", trackNames(got))
    }
}
```

Add a controller test that reconciles focus, verifies one publication, then reconciles wall and verifies no publications, `room.connected == false`, and the fake keyframe controller received `Stop()`.

- [ ] **Step 2: Run Go tests and confirm failure**

Run from `gateway-h264`:

```powershell
go test ./...
```

Expected: FAIL because wall currently plans and publishes all four H.264 tracks.

- [ ] **Step 3: Implement focus-only H.264 reconciliation**

Return an empty valid plan for `{Mode: "wall"}`. In `Controller.Reconcile`, stop the current tracks, robot selection, and LiveKit room before any connection attempt when the plan is empty:

```go
specs, err := plan.ForSelection(state.Selection)
if err != nil {
    return err
}
if len(specs) == 0 {
    controller.stopLocked(true)
    return nil
}
```

Retain the existing focus behavior that stops any old track before starting the newly selected camera and waits for a keyframe before publication.

- [ ] **Step 4: Run Go tests and build the gateway**

Run:

```powershell
go test ./...
go build -o master-h264-gateway.exe ./cmd/master-h264-gateway
```

Expected: all Go tests PASS and `master-h264-gateway.exe` is produced.

- [ ] **Step 5: Commit the SDK H.264 ownership change**

From `.codex-runtime/agentech_sdk_main`:

```powershell
git add -- 'agentech/robots/master/master vision app/gateway-h264/internal/plan/plan.go' 'agentech/robots/master/master vision app/gateway-h264/internal/plan/plan_test.go' 'agentech/robots/master/master vision app/gateway-h264/internal/controller/controller.go' 'agentech/robots/master/master vision app/gateway-h264/internal/controller/controller_test.go'
git commit -m "feat: publish Master H264 only in focus mode"
```

---

### Task 5: Verify, deploy to AGENTECH01, and publish the website main branch

**Files:**
- Verify: all files changed in Tasks 1-4
- Deploy: Master Vision `dist`, relay server files, and `master-h264-gateway.exe` to `C:\ProgramData\Agentech\MasterH264` on AGENTECH01
- Integrate: website commits into GitHub `main`

**Interfaces:**
- Consumes: built website, Master Vision wall publisher, and focus-only Go gateway.
- Produces: a locally verified hybrid scheduled stream, hidden AGENTECH01 services, and a production Vercel deployment sourced from GitHub `main`.

- [ ] **Step 1: Run the complete website verification suite**

From the website repository:

```powershell
npm test
npm run typecheck
npm run lint -- --quiet
npm run build
```

Expected: every command exits 0. The Next.js build includes `/api/master-live-camera/gateway`, and no Aegis/Navi test changes are required.

- [ ] **Step 2: Run the complete SDK verification suite**

From `agentech/robots/master/master vision app`:

```powershell
npm test
npm run build
```

From `gateway-h264`:

```powershell
go test ./...
go build -o master-h264-gateway.exe ./cmd/master-h264-gateway
```

From `robot`:

```powershell
python -m unittest master_h264_profiles_test.py master_h264_protocol_test.py master_h264_manager_test.py master_h264_service_test.py
```

Expected: all tests and builds PASS.

- [ ] **Step 3: Deploy AGENTECH01 artifacts without visible windows**

Copy the built `dist`, updated `server` files, and Go executable to a staging directory under the `wesle` profile on AGENTECH01. Stop only these scheduled tasks:

```text
Agentech Master H264 Primary
Agentech Master H264 Preview
Agentech Master H264 Gateway
```

Back up the current `C:\ProgramData\Agentech\MasterH264` runtime files to a timestamped sibling directory, replace the staged artifacts, and restart all three tasks with their existing `-WindowStyle Hidden` actions. Do not change secrets or task credentials.

- [ ] **Step 4: Verify AGENTECH01 health and ownership**

Check:

```text
http://127.0.0.1:4175/health
http://127.0.0.1:4173/health
```

Expected: primary H.264 relay is connected to the robot, preview reports proxy mode, and all scheduled tasks are Running. During wall mode, the Go gateway has zero H.264 viewers/publications and the headless `master-program` participant is present. During focus mode, `master-program` disconnects and only the selected `master-<camera>` publication remains.

- [ ] **Step 5: Verify the local website end to end**

Open:

```text
http://localhost:3200/agentech-products/eaic-hub/watch-live-run?masterCameraPreview=1
```

Verify the diagnostic preview still uses direct H.264. Then use an active scheduled Master session to verify the production path:

1. Camera Wall shows the established four JPEG-backed views.
2. Front Main switches to one 1920x1080 H.264 track.
3. Front Left and Front Right each switch to one 2064x1552 H.264 track.
4. RGB-D Color switches to one 640x480 H.264 track.
5. Returning to Camera Wall removes the native H.264 track and restores `master-program`.
6. LiveKit shows no more than one steady Master publisher participant.

- [ ] **Step 6: Integrate with the latest GitHub main safely**

Fetch `origin/main`, confirm all website implementation commits are present, and integrate them in a clean `codex/master-hybrid-streaming` worktree based on `origin/main`. Resolve only files changed by this feature, rerun `npm run test:master-live-camera`, `npm run typecheck`, and `npm run build`, then push the verified worktree HEAD to `origin/main`.

Expected: the push is fast-forward or an intentional feature merge from the latest `origin/main`; unrelated dirty files in the original worktree remain untouched.

- [ ] **Step 7: Verify the Vercel production deployment**

Use `vercel inspect https://www.agent-tech.ai` until the new GitHub `main` deployment is Ready. Confirm its source SHA equals the pushed main SHA. Run one short scheduled Master session and verify wall-to-focus-to-wall behavior on:

```text
https://www.agent-tech.ai/agentech-products/eaic-hub/watch-live-run
```

Expected: production matches the local hybrid behavior and does not add Aegis/Navi changes.
