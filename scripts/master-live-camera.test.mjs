import assert from "node:assert/strict";
import test from "node:test";
import {
  MASTER_LIVE_CAMERAS,
  normalizeLiveRobotModel,
  normalizeMasterCameraId,
  normalizeMasterViewSelection,
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
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ previewPath }) => previewPath), [
    "/h264/front-main",
    "/h264/front-left",
    "/h264/front-right",
    "/h264/rgbd-color",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ wallResolution }) => wallResolution), [
    "up to 1920x1080 H.264",
    "up to 1436x1080 H.264",
    "up to 1436x1080 H.264",
    "640x480 native H.264",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ trackName }) => trackName), [
    "master-front-main",
    "master-front-left",
    "master-front-right",
    "master-rgbd-color",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusResolution }) => focusResolution), [
    "native source H.264",
    "2064x1552 native H.264",
    "2064x1552 native H.264",
    "640x480 native H.264",
  ]);
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ focusFrameRate }) => focusFrameRate), [
    "up to 30 FPS",
    "up to 30 FPS",
    "up to 30 FPS",
    "up to 30 FPS",
  ]);
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
