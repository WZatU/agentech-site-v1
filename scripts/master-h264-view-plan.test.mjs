import assert from "node:assert/strict";
import test from "node:test";

import { planMasterH264Views } from "../lib/master-h264-view-plan.ts";

test("wall plans exactly four H264 endpoints and focus plans only one", () => {
  assert.deepEqual(
    planMasterH264Views({ mode: "wall" }).map((view) => view.previewPath),
    [
      "/h264/front-main",
      "/h264/front-left",
      "/h264/front-right",
      "/h264/rgbd-color",
    ],
  );
  assert.deepEqual(planMasterH264Views({ mode: "focus", cameraId: "front-left" }), [{
    cameraId: "front-left",
    label: "Front Left",
    trackName: "master-front-left",
    previewPath: "/h264/front-left",
    mode: "focus",
  }]);
});

test("rear and depth selections normalize to the four-camera wall", () => {
  assert.equal(planMasterH264Views({ mode: "focus", cameraId: "rear" }).length, 4);
  assert.equal(planMasterH264Views({ mode: "focus", cameraId: "depth-map" }).length, 4);
});
