# Master High-Resolution Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Master's four-camera wall at 480x360 while switching a selected front camera to 1440x1080 and RGB-D Color to its native 640x480, with only the selected high-resolution converter doing image work.

**Architecture:** The robot keeps the existing four low-latency topics and adds four subscriber-aware focus topics. The website chooses wall or focus metadata from one camera catalog, prefers the focus topic for a selected camera, and falls back to its wall topic if the focus publisher is unavailable. The existing Master Robot Vision relay protocol and focus arbitration remain unchanged.

**Tech Stack:** Next.js/React/TypeScript, Node.js built-in test runner, Python 3, ROS 2 `rclpy`, GStreamer/NVIDIA JPEG elements, Bash, systemd user services, Master Robot Vision WebSocket relay.

## Global Constraints

- Camera Wall remains four approved views at 480x360, JPEG quality 25, up to 30 FPS.
- Front Main, Front Left, and Front Right focus streams are 1440x1080, JPEG quality 50, up to 30 FPS.
- RGB-D Color focus is its robot-native 640x480, JPEG quality 50, up to 30 FPS.
- Focus mode subscribes to exactly one camera; unselected focus converters skip decode and encode work.
- Missing focus topics fall back to the selected camera's 480x360 wall topic.
- Rear remains excluded.
- Aegis and Navi behavior and configuration remain unchanged.
- The current JPEG/WebSocket preview transport remains in place; H.264/WebRTC/LiveKit is outside this change.
- Preserve unrelated working-tree changes and the untracked `.codex-runtime/` directory. Stage only files named by each task.

## File Structure

- `lib/master-live-camera.ts`: canonical Master camera wall/focus metadata and pure stream-resolution helper.
- `scripts/master-live-camera.test.mjs`: executable tests for camera metadata, selection normalization, preferred focus resolution, and fallback behavior.
- `features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx`: relay subscription selection, canvas decode queue, fallback labeling, and stream-state reset.
- `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`: selection-aware quality summary and badge.
- `scripts/master-live-camera-ui.test.mjs`: source-level UI integration assertions for the direct preview.
- `scripts/master_camera_web_policy.py`: ROS-independent subscriber-aware frame-processing policy.
- `scripts/test_master_camera_web_policy.py`: local unit tests for the policy.
- `scripts/master_camera_web_optimizer.py`: ROS/GStreamer optimizer integration with the policy and CLI flag.
- `scripts/master-camera-web-service/start-master-camera-web.sh`: four existing wall workers plus four independently supervised focus workers.
- `scripts/master-camera-web-service.test.mjs`: launcher and service configuration assertions.
- `/home/run/.local/share/agentech/` on Master: deployed optimizer, policy, and launcher used by the existing user service.

---

### Task 1: Add Canonical Wall and Focus Stream Selection

**Files:**
- Modify: `lib/master-live-camera.ts`
- Modify: `scripts/master-live-camera.test.mjs`

**Interfaces:**
- Consumes: existing `MasterCameraId`, `MasterViewSelection`, and approved camera allowlist.
- Produces: camera fields `wallTopic`, `wallResolution`, `focusTopic`, and `focusResolution`; `resolveMasterCameraStream(cameraId, mode, advertisedTopics)` returning `{ topic, resolution, quality: "wall" | "focus" | "fallback" } | null`.

- [ ] **Step 1: Write failing metadata and resolver tests**

Replace the old `topic`/`resolution` assertions and add resolver cases:

```js
import {
  MASTER_LIVE_CAMERAS,
  resolveMasterCameraStream,
} from "../lib/master-live-camera.ts";

test("Master cameras define low-latency wall and high-resolution focus streams", () => {
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ wallTopic }) => wallTopic), [
    "/agentech/web/front_main/compressed",
    "/agentech/web/front_left/compressed",
    "/agentech/web/front_right/compressed",
    "/agentech/web/rgbd_color/compressed",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusTopic }) => focusTopic), [
    "/agentech/web/focus/front_main/compressed",
    "/agentech/web/focus/front_left/compressed",
    "/agentech/web/focus/front_right/compressed",
    "/agentech/web/focus/rgbd_color/compressed",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusResolution }) => focusResolution), [
    "1440x1080 high resolution",
    "1440x1080 high resolution",
    "1440x1080 high resolution",
    "640x480 native",
  ]);
});

test("focus selection prefers its focus topic and falls back to the wall topic", () => {
  const camera = MASTER_LIVE_CAMERAS[0];
  assert.deepEqual(
    resolveMasterCameraStream(camera.id, "focus", [camera.wallTopic, camera.focusTopic]),
    { topic: camera.focusTopic, resolution: camera.focusResolution, quality: "focus" },
  );
  assert.deepEqual(
    resolveMasterCameraStream(camera.id, "focus", [camera.wallTopic]),
    { topic: camera.wallTopic, resolution: camera.wallResolution, quality: "fallback" },
  );
  assert.equal(resolveMasterCameraStream(camera.id, "focus", []), null);
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test scripts\master-live-camera.test.mjs
```

Expected: FAIL because `wallTopic`, `focusTopic`, `focusResolution`, and `resolveMasterCameraStream` do not exist.

- [ ] **Step 3: Implement the camera metadata and pure resolver**

Use this shape in `lib/master-live-camera.ts`:

```ts
export const MASTER_LIVE_CAMERAS = [
  {
    id: "front-main",
    label: "Front Main",
    wallTopic: "/agentech/web/front_main/compressed",
    wallResolution: "480x360 low latency",
    focusTopic: "/agentech/web/focus/front_main/compressed",
    focusResolution: "1440x1080 high resolution",
  },
  {
    id: "front-left",
    label: "Front Left",
    wallTopic: "/agentech/web/front_left/compressed",
    wallResolution: "480x360 low latency",
    focusTopic: "/agentech/web/focus/front_left/compressed",
    focusResolution: "1440x1080 high resolution",
  },
  {
    id: "front-right",
    label: "Front Right",
    wallTopic: "/agentech/web/front_right/compressed",
    wallResolution: "480x360 low latency",
    focusTopic: "/agentech/web/focus/front_right/compressed",
    focusResolution: "1440x1080 high resolution",
  },
  {
    id: "rgbd-color",
    label: "RGB-D Color",
    wallTopic: "/agentech/web/rgbd_color/compressed",
    wallResolution: "480x360 low latency",
    focusTopic: "/agentech/web/focus/rgbd_color/compressed",
    focusResolution: "640x480 native",
  },
] as const;

export type MasterCameraStream = {
  topic: string;
  resolution: string;
  quality: "wall" | "focus" | "fallback";
};

export function resolveMasterCameraStream(
  cameraId: MasterCameraId,
  mode: "wall" | "focus",
  advertisedTopics: readonly string[],
): MasterCameraStream | null {
  const camera = MASTER_LIVE_CAMERAS.find(({ id }) => id === cameraId);
  if (!camera) return null;
  const advertised = new Set(advertisedTopics);
  if (mode === "focus" && advertised.has(camera.focusTopic)) {
    return { topic: camera.focusTopic, resolution: camera.focusResolution, quality: "focus" };
  }
  if (advertised.has(camera.wallTopic)) {
    return {
      topic: camera.wallTopic,
      resolution: camera.wallResolution,
      quality: mode === "focus" ? "fallback" : "wall",
    };
  }
  return null;
}
```

Write all four camera objects explicitly; do not generate topics or include Rear.

- [ ] **Step 4: Run the targeted test and verify GREEN**

Run the Step 2 command. Expected: all tests in `master-live-camera.test.mjs` PASS.

- [ ] **Step 5: Commit only the catalog and catalog tests**

```powershell
git add -- lib/master-live-camera.ts scripts/master-live-camera.test.mjs
git commit -m "feat: define Master high-resolution focus streams"
```

### Task 2: Switch the Website Between Wall, Focus, and Fallback Streams

**Files:**
- Modify: `features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx`
- Modify: `features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx`
- Modify: `scripts/master-live-camera-ui.test.mjs`

**Interfaces:**
- Consumes: `resolveMasterCameraStream`, `wallResolution`, and `focusResolution` from Task 1.
- Produces: wall subscriptions to four `wallTopic` values; focus subscription to one preferred `focusTopic`; selected wall fallback; selection-aware badges.

- [ ] **Step 1: Write failing UI integration assertions**

Update `scripts/master-live-camera-ui.test.mjs` to require the resolver and dynamic labels:

```js
test("Master direct preview chooses focus streams and labels wall fallback", () => {
  const wall = readFileSync("features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx", "utf8");
  assert.match(wall, /resolveMasterCameraStream/);
  assert.match(wall, /streamLabels/);
  assert.match(wall, /quality === "fallback"/);
  assert.match(wall, /480x360 fallback/);
  assert.match(wall, /setAvailable\(\{\}\)/);
});

test("Master controls describe wall and high-resolution focus modes", () => {
  assert.match(controls, /480x360 at 30 FPS/);
  assert.match(controls, /focusResolution/);
  assert.match(controls, /High-resolution/);
  assert.match(controls, /30 FPS/);
});
```

Remove obsolete assertions that forbid `High-resolution` or require `camera.resolution`.

- [ ] **Step 2: Run the UI test and verify RED**

Run:

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test scripts\master-live-camera-ui.test.mjs
```

Expected: FAIL because the component still subscribes to `camera.topic` and uses the old static resolution field.

- [ ] **Step 3: Implement stream resolution during `advertise`**

In `MasterDirectCameraWall`:

```ts
const [streamLabels, setStreamLabels] = useState<Partial<Record<MasterCameraId, string>>>({});

// At the start of each selection-dependent effect:
setAvailable({});
setStreamLabels({});

const advertisedTopics = message.channels?.map(({ topic }) => topic) ?? [];
const wanted = MASTER_LIVE_CAMERAS.filter(
  (camera) => selection.mode === "wall" || camera.id === selection.cameraId,
);
for (const [index, camera] of wanted.entries()) {
  const stream = resolveMasterCameraStream(camera.id, selection.mode, advertisedTopics);
  if (!stream) continue;
  const channel = message.channels?.find(({ topic }) => topic === stream.topic);
  if (!channel || channel.encoding !== "cdr") continue;
  const id = index + 1;
  subscriptions.set(id, {
    cameraId: camera.id,
    reader: new MessageReader(parse(channel.schema, { ros2: true })),
  });
  requests.push({ id, channelId: channel.id });
  setStreamLabels((current) => ({
    ...current,
    [camera.id]: stream.quality === "fallback" ? "480x360 fallback" : stream.resolution,
  }));
}
```

Import `resolveMasterCameraStream`. Keep `masterRobotMode` as `focus` for a focus selection even when the selected topic is the 480x360 fallback.

- [ ] **Step 4: Render selection-aware labels and control copy**

Replace the canvas badge's old `camera.resolution` with:

```tsx
{streamLabels[camera.id]
  ?? (selection.mode === "focus" ? camera.focusResolution : camera.wallResolution)}
```

In `MasterLiveCameraControls`, compute the selected camera once and display its `focusResolution` in focus mode. Change the mode badge to `High-resolution · 30 FPS` for focus and retain `Low-latency · 30 FPS` for wall.

- [ ] **Step 5: Run the UI and camera tests and verify GREEN**

Run:

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test scripts\master-live-camera.test.mjs scripts\master-live-camera-ui.test.mjs
```

Expected: all camera catalog and direct-preview tests PASS.

- [ ] **Step 6: Commit only the website focus switching files**

```powershell
git add -- features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx scripts/master-live-camera-ui.test.mjs
git commit -m "feat: switch Master focus views to high resolution"
```

### Task 3: Make High-Resolution Conversion Subscriber-Aware

**Files:**
- Create: `scripts/master_camera_web_policy.py`
- Create: `scripts/test_master_camera_web_policy.py`
- Modify: `scripts/master_camera_web_optimizer.py`

**Interfaces:**
- Consumes: ROS publisher `get_subscription_count()` and the existing optimizer callback.
- Produces: `should_process_frame(pause_without_subscribers: bool, subscription_count: int) -> bool`; optimizer CLI flag `--pause-without-subscribers`.

- [ ] **Step 1: Write the failing ROS-independent policy test**

Create `scripts/test_master_camera_web_policy.py`:

```py
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from master_camera_web_policy import should_process_frame


class MasterCameraWebPolicyTest(unittest.TestCase):
    def test_focus_stream_pauses_without_subscribers(self):
        self.assertFalse(should_process_frame(True, 0))
        self.assertTrue(should_process_frame(True, 1))

    def test_wall_stream_keeps_processing_without_subscribers(self):
        self.assertTrue(should_process_frame(False, 0))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the policy test and verify RED**

Run:

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest scripts\test_master_camera_web_policy.py -v
```

Expected: FAIL because `master_camera_web_policy.py` does not exist.

- [ ] **Step 3: Implement the minimal pure policy**

Create `scripts/master_camera_web_policy.py`:

```py
def should_process_frame(pause_without_subscribers, subscription_count):
    return not pause_without_subscribers or subscription_count > 0
```

- [ ] **Step 4: Integrate the policy and CLI flag into the optimizer**

In `master_camera_web_optimizer.py`:

```py
from master_camera_web_policy import should_process_frame

# __init__
self._pause_without_subscribers = args.pause_without_subscribers

# first lines of _on_image, before the rate gate and bytes allocation
if not should_process_frame(
    self._pause_without_subscribers,
    self._publisher.get_subscription_count(),
):
    return

# parse_args
parser.add_argument("--pause-without-subscribers", action="store_true")
```

Update the startup log to include whether subscriber-aware pause is enabled.

- [ ] **Step 5: Run the policy test and syntax checks and verify GREEN**

Run:

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest scripts\test_master_camera_web_policy.py -v
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m py_compile scripts\master_camera_web_policy.py scripts\master_camera_web_optimizer.py
```

Expected: policy tests PASS and both files compile.

- [ ] **Step 6: Commit the subscriber-aware optimizer policy**

```powershell
git add -- scripts/master_camera_web_policy.py scripts/test_master_camera_web_policy.py scripts/master_camera_web_optimizer.py
git commit -m "feat: pause idle Master focus converters"
```

### Task 4: Launch and Supervise Four Focus Publishers

**Files:**
- Modify: `scripts/master-camera-web-service/start-master-camera-web.sh`
- Modify: `scripts/master-camera-web-service.test.mjs`
- Verify unchanged: `scripts/master-camera-web-service/agentech-master-camera-web.service`

**Interfaces:**
- Consumes: `--pause-without-subscribers` from Task 3.
- Produces: the four `/agentech/web/focus/*/compressed` topics with exact approved dimensions, quality, and FPS; independent retry loops for focus workers.

- [ ] **Step 1: Write failing launcher assertions**

Add to `scripts/master-camera-web-service.test.mjs`:

```js
test("Master camera service defines subscriber-aware focus publishers", () => {
  for (const topic of ["front_main", "front_left", "front_right", "rgbd_color"]) {
    assert.match(launcher, new RegExp(`/agentech/web/focus/${topic}/compressed`));
  }
  assert.equal((launcher.match(/--width 1440 --height 1080 --quality 50 --max-fps 30/g) ?? []).length, 3);
  assert.equal((launcher.match(/--width 640 --height 480 --quality 50 --max-fps 30/g) ?? []).length, 1);
  assert.equal((launcher.match(/--pause-without-subscribers/g) ?? []).length, 4);
});

test("focus worker failures do not stop wall publishers", () => {
  assert.match(launcher, /start_focus_stream/);
  assert.match(launcher, /wait -n "\$\{wall_pids\[@\]\}"/);
  assert.match(launcher, /while true/);
});
```

Keep the existing assertions requiring exactly four 480x360 wall publishers and excluding Rear.

- [ ] **Step 2: Run the launcher test and verify RED**

Run:

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test scripts\master-camera-web-service.test.mjs
```

Expected: FAIL because no focus publishers or independent focus supervisor exist.

- [ ] **Step 3: Separate required wall workers from resilient focus workers**

Use two PID arrays and a focus wrapper:

```bash
wall_pids=()
focus_pids=()

start_wall_stream() {
  python3 "$optimizer" "$@" &
  wall_pids+=("$!")
}

start_focus_stream() {
  (
    while true; do
      python3 "$optimizer" "$@" || true
      sleep 1
    done
  ) &
  focus_pids+=("$!")
}
```

Make `stop_all` terminate and wait for both arrays. Keep systemd `KillMode=control-group` so service shutdown also terminates any optimizer child active inside a focus wrapper. Wait only on required wall PIDs:

```bash
wait -n "${wall_pids[@]}"
```

- [ ] **Step 4: Add the four exact focus publisher commands**

Add these commands after the four unchanged wall commands:

```bash
start_focus_stream --input-topic /aima/hal/sensor/rgb_head_front_center/rgb_image/compressed --output-topic /agentech/web/focus/front_main/compressed --node-name agentech_web_focus_front_main --width 1440 --height 1080 --quality 50 --max-fps 30 --pause-without-subscribers
start_focus_stream --input-topic /aima/hal/sensor/stereo_head_front_left/rgb_image/compressed --output-topic /agentech/web/focus/front_left/compressed --node-name agentech_web_focus_front_left --width 1440 --height 1080 --quality 50 --max-fps 30 --pause-without-subscribers
start_focus_stream --input-topic /aima/hal/sensor/stereo_head_front_right/rgb_image/compressed --output-topic /agentech/web/focus/front_right/compressed --node-name agentech_web_focus_front_right --width 1440 --height 1080 --quality 50 --max-fps 30 --pause-without-subscribers
start_focus_stream --input-topic /aima/hal/sensor/rgbd_head_front/rgb_image/compressed --output-topic /agentech/web/focus/rgbd_color/compressed --node-name agentech_web_focus_rgbd_color --width 640 --height 480 --quality 50 --max-fps 30 --pause-without-subscribers
```

- [ ] **Step 5: Run launcher tests and Bash syntax verification**

Run the Step 2 Node command. Expected: all launcher tests PASS.

Also run on Master during deployment before restarting the service:

```bash
bash -n /home/run/.local/share/agentech/start-master-camera-web.sh
```

- [ ] **Step 6: Commit only launcher and launcher tests**

```powershell
git add -- scripts/master-camera-web-service/start-master-camera-web.sh scripts/master-camera-web-service.test.mjs
git commit -m "feat: publish on-demand Master focus streams"
```

### Task 5: Deploy to Master and Verify the Complete Flow

**Files:**
- Deploy: `scripts/master_camera_web_policy.py` to `/home/run/.local/share/agentech/master_camera_web_policy.py`
- Deploy: `scripts/master_camera_web_optimizer.py` to `/home/run/.local/share/agentech/master_camera_web_optimizer.py`
- Deploy: `scripts/master-camera-web-service/start-master-camera-web.sh` to `/home/run/.local/share/agentech/start-master-camera-web.sh`
- Verify: local Next.js preview at `/agentech-products/eaic-hub/watch-live-run?masterCameraPreview=1`

**Interfaces:**
- Consumes: Tasks 1–4 and the existing AGENTECH01-to-Master authenticated bridge.
- Produces: a running physical-robot service with four wall and four on-demand focus topics, plus verified browser switching.

- [ ] **Step 1: Run the complete local automated suite**

```powershell
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test scripts\master-live-camera.test.mjs scripts\master-live-camera-state.test.mjs scripts\master-live-camera-ui.test.mjs scripts\master-camera-web-service.test.mjs
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest scripts\test_master_camera_web_policy.py -v
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m py_compile scripts\master_camera_web_policy.py scripts\master_camera_web_optimizer.py
& 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules\typescript\bin\tsc --noEmit
git diff --check
```

Expected: every command exits 0. Existing Node warnings about TypeScript module reparsing may remain; there must be no test failures, type errors, Python syntax errors, or whitespace errors.

- [ ] **Step 2: Copy only the three deployment files through AGENTECH01**

Use OpenSSH ProxyJump so the files travel from the workspace through the existing `agentech01` SSH alias directly to Master. The robot password is entered at the SSH prompt and is never written to a file:

```powershell
scp -J agentech01 scripts\master_camera_web_policy.py run@192.168.4.66:/home/run/.local/share/agentech/master_camera_web_policy.py
scp -J agentech01 scripts\master_camera_web_optimizer.py run@192.168.4.66:/home/run/.local/share/agentech/master_camera_web_optimizer.py
scp -J agentech01 scripts\master-camera-web-service\start-master-camera-web.sh run@192.168.4.66:/home/run/.local/share/agentech/start-master-camera-web.sh
ssh -J agentech01 run@192.168.4.66 "chmod 0755 /home/run/.local/share/agentech/start-master-camera-web.sh"
```

- [ ] **Step 3: Validate and restart the existing Master user service**

Through the same authenticated hop, run:

```bash
bash -n /home/run/.local/share/agentech/start-master-camera-web.sh
systemctl --user daemon-reload
systemctl --user restart agentech-master-camera-web.service
systemctl --user is-active agentech-master-camera-web.service
systemctl --user status agentech-master-camera-web.service --no-pager -l
```

Expected: `is-active` prints `active`; status contains four 480x360 wall optimizers and four focus optimizer/supervisor commands, with no Rear process.

- [ ] **Step 4: Verify idle focus publishers and wall mode**

Keep the website on Camera Wall. Inspect robot process CPU twice over ten seconds and confirm the subscriber-aware focus workers remain alive but do not log published focus frames without subscribers. Confirm the relay health endpoint reports `robot: "connected"`, at least one viewer, and increasing `framesForwarded`.

In the browser, require:

```text
Receiving 4 Master cameras
Front Main · 480x360 low latency
Front Left · 480x360 low latency
Front Right · 480x360 low latency
RGB-D Color · 480x360 low latency
```

- [ ] **Step 5: Verify each focus resolution and fallback behavior**

Click each focus control individually, waiting for the status to report one camera. Inspect the canvas `width` and `height` attributes:

```text
Front Main: 1440 x 1080
Front Left: 1440 x 1080
Front Right: 1440 x 1080
RGB-D Color: 640 x 480
```

Return to Camera Wall between focus checks and confirm four streams recover. The missing-focus fallback is covered by Task 1's pure resolver test; do not disrupt a running hardware publisher merely to reproduce it.

- [ ] **Step 6: Measure focus throughput and stability**

For each front focus camera, sample relay health and AGENTECH01 route statistics for at least ten seconds. Record delivered frames, last-frame age, and Mbps. Acceptance criteria:

- no blank canvas or reconnect loop;
- frames continue increasing for the selected camera;
- last frame remains under two seconds old;
- wall mode restores four active streams after focus;
- focus bandwidth remains below the current Wi-Fi negotiated link speed with operational headroom.

If 1440x1080 at quality 50 cannot keep the last frame under two seconds, stop and report the measured bottleneck. Do not silently lower the approved resolution or FPS.

- [ ] **Step 7: Run final verification again**

Re-run the full commands from Step 1, confirm the service remains `active`, and leave the browser in Camera Wall mode with all four 480x360 streams receiving. Deployment creates no tracked file and requires no additional commit.
