import assert from "node:assert/strict";
import test from "node:test";
import {
  MASTER_LIVE_CAMERAS,
  normalizeLiveRobotModel,
  normalizeMasterCameraId,
  normalizeMasterViewSelection,
} from "../lib/master-live-camera.ts";

test("Master live camera allowlist contains only the four primary RGB views", () => {
  assert.deepEqual(MASTER_LIVE_CAMERAS.map(({ id }) => id), [
    "front-main",
    "front-left",
    "front-right",
    "rear-view",
  ]);
  assert.equal(normalizeMasterCameraId("rgbd-color"), null);
  assert.equal(normalizeMasterCameraId("depth-map"), null);
  assert.equal(normalizeMasterCameraId("lidar-3d"), null);
});

test("Master view selection accepts wall or one allowlisted focus camera", () => {
  assert.deepEqual(normalizeMasterViewSelection({ mode: "wall" }), { mode: "wall" });
  assert.deepEqual(normalizeMasterViewSelection({ mode: "focus", cameraId: "rear-view" }), {
    mode: "focus",
    cameraId: "rear-view",
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
