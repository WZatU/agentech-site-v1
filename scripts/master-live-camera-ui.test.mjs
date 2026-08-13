import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const controls = readFileSync(new URL("../features/eaic/05-delivery/live-results/components/master-live-camera-controls.tsx", import.meta.url), "utf8");
const camera = readFileSync(new URL("../features/eaic/05-delivery/live-results/components/live-robot-camera.tsx", import.meta.url), "utf8");
const cameraConfig = readFileSync(new URL("../lib/master-live-camera.ts", import.meta.url), "utf8");

test("Master controls expose wall, three front RGB cameras, and RGB-D Color", () => {
  assert.match(controls, /Camera Wall/);
  assert.match(controls, /MASTER_LIVE_CAMERAS\.map/);
  assert.match(camera + controls, /RGB-D Color|MASTER_LIVE_CAMERAS/);
  assert.doesNotMatch(controls, /Depth Map|LiDAR 3D/);
  assert.doesNotMatch(controls, /Rear View/);
});

test("Live camera gates Master controls and keeps one shared video element", () => {
  assert.match(camera, /activeRobotModel === "Master"/);
  assert.match(camera, /activeRobotModel === "Master" \? "master-live-1" : roomName/);
  assert.match(camera, /MasterLiveCameraControls/);
  assert.equal((camera.match(/<video\b/g) ?? []).length, 1);
  assert.match(camera, /Navi live session: live video only/);
  assert.match(camera, /Aegies live session: display-mode captures/);
});

test("Master preview is development-only and uses the direct wired camera wall", () => {
  assert.match(camera, /NODE_ENV === "development"/);
  assert.match(camera, /NEXT_PUBLIC_MASTER_CAMERA_PREVIEW/);
  assert.match(camera, /masterCameraPreview/);
  assert.match(camera, /localhost|127\.0\.0\.1/);
  assert.match(controls, /Direct wired Master preview through AGENTECH01/);
  assert.match(controls, /onClick=\{\(\) => void choose\(\{ mode: "focus", cameraId: camera.id \}\)\}/);
  assert.match(controls, /MasterDirectCameraWall/);
  assert.match(controls, /selection=\{selection\}/);
});

test("Master direct wall decodes one frame per camera and keeps only the newest backlog", () => {
  const wall = readFileSync("features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx", "utf8");
  assert.match(wall, /ws:\/\/127\.0\.0\.1:4173\/robot/);
  assert.doesNotMatch(wall, /127\.0\.0\.1:4175/);
  assert.match(wall, /masterRobotMode: selection.mode === "focus" \? "focus" : "preview"/);
  assert.match(wall, /createImageBitmap/);
  assert.match(wall, /pendingFrames/);
  assert.match(wall, /decodingFrames/);
  assert.doesNotMatch(wall, /decodeVersions/);
  assert.match(wall, /drawImage\(bitmap/);
  assert.doesNotMatch(wall, /<img/);
  assert.doesNotMatch(wall, /4K Focus/);
  assert.doesNotMatch(wall, /rear-view|rgb_head_rear/);
});

test("Master direct preview chooses focus streams and labels wall fallback", () => {
  const wall = readFileSync("features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx", "utf8");
  assert.match(wall, /resolveMasterCameraStream/);
  assert.match(wall, /streamLabels/);
  assert.match(wall, /quality === "fallback"/);
  assert.match(wall, /480x360 fallback/);
  assert.match(wall, /setAvailable\(\{\}\)/);
});

test("Front Right focus exclusively uses the raw H264 WebCodecs path", () => {
  const wall = readFileSync("features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx", "utf8");
  const h264 = readFileSync("features/eaic/05-delivery/live-results/components/master-h264-preview.mjs", "utf8");
  assert.match(wall, /selection\.mode === "focus" && selection\.cameraId === "front-right"/);
  assert.match(wall, /startMasterH264Preview/);
  assert.match(wall, /getMasterH264PreviewUrl\(RELAY_URL\)/);
  assert.match(wall, /raw RGB.*H\.264|H\.264.*raw RGB/s);
  assert.match(h264, /VideoDecoder/);
  assert.match(h264, /EncodedVideoChunk/);
  assert.match(h264, /\/h264\/front-right/);
  assert.doesNotMatch(h264, /createImageBitmap|new WebSocketImpl\([^)]*\/robot/);
});

test("hidden Master preview tabs release their camera connection", () => {
  const wall = readFileSync("features/eaic/05-delivery/live-results/components/master-direct-camera-wall.tsx", "utf8");
  assert.match(wall, /document\.visibilityState/);
  assert.match(wall, /visibilitychange/);
  assert.match(wall, /Paused while this tab is hidden/);
  assert.match(wall, /document\.removeEventListener/);
});

test("Master controls describe wall and high-resolution focus modes", () => {
  assert.match(controls, /480x360 at 30 FPS/);
  assert.match(controls, /focusResolution/);
  assert.match(controls, /focusFrameRate/);
  assert.match(cameraConfig, /up to 30 FPS/);
  assert.match(controls, /High-resolution/);
  assert.doesNotMatch(controls, /4K program|native 4K|One 4K stream max/);
});
