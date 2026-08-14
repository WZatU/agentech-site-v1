import assert from "node:assert/strict";
import test from "node:test";
import {
  desiredMasterTrackSubscriptions,
  resolveMasterTrackLayout,
} from "../lib/master-livekit-track-state.ts";

function publicationsForAllFourTracks() {
  return [
    { trackName: "master-front-main", trackSid: "front-main-sid" },
    { trackName: "master-front-left", trackSid: "front-left-sid" },
    { trackName: "master-front-right", trackSid: "front-right-sid" },
    { trackName: "master-rgbd-color", trackSid: "rgbd-color-sid" },
  ];
}

test("wall maps four stable track names and focus ignores the other three", () => {
  const publications = publicationsForAllFourTracks();
  assert.deepEqual(
    resolveMasterTrackLayout({ mode: "wall" }, publications).map((slot) => slot.cameraId),
    ["front-main", "front-left", "front-right", "rgbd-color"],
  );
  assert.deepEqual(
    resolveMasterTrackLayout({ mode: "focus", cameraId: "front-right" }, publications).map((slot) => slot.cameraId),
    ["front-right"],
  );
});

test("unknown and rear tracks never enter the Master layout", () => {
  const layout = resolveMasterTrackLayout({ mode: "wall" }, [
    { trackName: "master-rear", trackSid: "rear-sid" },
    { trackName: "unknown-video", trackSid: "unknown-sid" },
  ]);
  assert.equal(layout.every((slot) => slot.publication === null), true);
});

test("focus unsubscribes every non-selected Master track", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions(
      { mode: "focus", cameraId: "front-right" },
      publicationsForAllFourTracks(),
    ),
    [
      { trackSid: "front-main-sid", subscribe: false },
      { trackSid: "front-left-sid", subscribe: false },
      { trackSid: "front-right-sid", subscribe: true },
      { trackSid: "rgbd-color-sid", subscribe: false },
    ],
  );
});
