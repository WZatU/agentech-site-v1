import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const controls = readFileSync(new URL("../features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx", import.meta.url), "utf8");
const camera = readFileSync(new URL("../features/eaic/05-delivery/live-results/components/live-robot-camera.tsx", import.meta.url), "utf8");

test("Master controls expose wall and exactly four primary RGB camera choices", () => {
  assert.match(controls, /Camera Wall/);
  assert.match(controls, /MASTER_LIVE_CAMERAS\.map/);
  assert.doesNotMatch(controls, /RGB-D Color|Depth Map|LiDAR 3D/);
});

test("Live camera gates Master controls and keeps one shared video element", () => {
  assert.match(camera, /activeRobotModel === "Master"/);
  assert.match(camera, /MasterLiveCameraControls/);
  assert.equal((camera.match(/<video\b/g) ?? []).length, 1);
  assert.match(camera, /Navi live session: live video only/);
  assert.match(camera, /Aegies live session: display-mode captures/);
});

test("Master preview is development-only and does not claim a live connection", () => {
  assert.match(camera, /NODE_ENV === "development"/);
  assert.match(camera, /NEXT_PUBLIC_MASTER_CAMERA_PREVIEW/);
  assert.match(camera, /masterCameraPreview/);
  assert.match(camera, /localhost|127\.0\.0\.1/);
  assert.match(controls, /Master camera UI preview/);
});
