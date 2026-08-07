import assert from "node:assert/strict";
import test from "node:test";
import {
  clearMasterViewSelection,
  getMasterViewSelection,
  setMasterViewSelection,
} from "../lib/master-live-camera-state.ts";

test("Master view state defaults to wall and stores only normalized selections", () => {
  assert.deepEqual(getMasterViewSelection(41), { mode: "wall" });
  assert.deepEqual(setMasterViewSelection(41, { mode: "focus", cameraId: "front-left" }), {
    mode: "focus",
    cameraId: "front-left",
  });
  assert.deepEqual(setMasterViewSelection(41, { mode: "focus", cameraId: "depth-map" }), {
    mode: "wall",
  });
  clearMasterViewSelection(41);
  assert.deepEqual(getMasterViewSelection(41), { mode: "wall" });
});
