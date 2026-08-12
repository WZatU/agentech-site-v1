import assert from "node:assert/strict";
import test from "node:test";
import {
  MASTER_LIVE_CAMERAS,
  normalizeLiveRobotModel,
  normalizeMasterCameraId,
  normalizeMasterViewSelection,
  resolveMasterCameraStream,
} from "../lib/master-live-camera.ts";

test("Master live camera allowlist contains the three front RGB views and RGB-D color", () => {
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ id }) => id), [
    "front-main",
    "front-left",
    "front-right",
    "rgbd-color",
  ]);
  assert.equal(normalizeMasterCameraId("rear-view"), null);
  assert.equal(normalizeMasterCameraId("rgbd-color"), "rgbd-color");
  assert.equal(normalizeMasterCameraId("depth-map"), null);
  assert.equal(normalizeMasterCameraId("lidar-3d"), null);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ wallTopic }) => wallTopic), [
    "/agentech/web/front_main/compressed",
    "/agentech/web/front_left/compressed",
    "/agentech/web/front_right/compressed",
    "/agentech/web/rgbd_color/compressed",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ wallResolution }) => wallResolution), [
    "480x360 low latency",
    "480x360 low latency",
    "480x360 low latency",
    "480x360 low latency",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusTopic }) => focusTopic), [
    "/agentech/web/focus/front_main/compressed",
    "/agentech/web/focus/front_left/compressed",
    "/agentech/web/focus/front_right/compressed",
    "/agentech/web/focus/rgbd_color/compressed",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusResolution }) => focusResolution), [
    "2560x1851 2K",
    "960x720 high resolution",
    "960x720 high resolution",
    "640x480 native",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusFrameRate }) => focusFrameRate), [
    "up to 30 FPS",
    "up to 30 FPS",
    "up to 30 FPS",
    "up to 30 FPS",
  ]);
});

test("focus selection prefers its focus topic and falls back to the wall topic", () => {
  const camera = MASTER_LIVE_CAMERAS[0];
  assert.deepEqual(
    resolveMasterCameraStream(camera.id, "focus", [camera.wallTopic, camera.focusTopic]),
    { topic: "/agentech/web/focus/front_main/compressed", resolution: "2560x1851 2K", quality: "focus" },
  );
  assert.deepEqual(
    resolveMasterCameraStream(camera.id, "focus", [camera.wallTopic]),
    { topic: camera.wallTopic, resolution: camera.wallResolution, quality: "fallback" },
  );
  assert.equal(resolveMasterCameraStream(camera.id, "focus", []), null);
});

test("Master view selection accepts wall or one allowlisted focus camera", () => {
  assert.deepEqual(normalizeMasterViewSelection({ mode: "wall" }), { mode: "wall" });
  assert.deepEqual(normalizeMasterViewSelection({ mode: "focus", cameraId: "front-right" }), {
    mode: "focus",
    cameraId: "front-right",
  });
  assert.deepEqual(normalizeMasterViewSelection({ mode: "focus", cameraId: "depth-map" }), {
    mode: "wall",
  });
});

test("delivery robot normalization recognizes Master without changing existing aliases", () => {
  assert.equal(normalizeLiveRobotModel("Master"), "Master");
  assert.equal(normalizeLiveRobotModel("Aegis"), "Aegies");
  assert.equal(normalizeLiveRobotModel("Navi"), "Navi");
});
