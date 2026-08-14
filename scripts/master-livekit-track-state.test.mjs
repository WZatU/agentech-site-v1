import assert from "node:assert/strict";
import test from "node:test";
import {
  desiredMasterTrackSubscriptions,
  resolveMasterTrackLayout,
} from "../lib/master-livekit-track-state.ts";

function publicationsForHybridTracks() {
  return [
    { trackName: "master-program", trackSid: "wall-sid" },
    { trackName: "master-front-main", trackSid: "front-main-sid" },
    { trackName: "master-front-left", trackSid: "front-left-sid" },
    { trackName: "master-front-right", trackSid: "front-right-sid" },
    { trackName: "master-rgbd-color", trackSid: "rgbd-color-sid" },
  ];
}

test("wall maps all four H264 cameras and focus maps one selected camera", () => {
  const publications = publicationsForHybridTracks();
  assert.deepEqual(
    resolveMasterTrackLayout({ mode: "wall" }, publications).map((slot) => slot.id),
    ["front-main", "front-left", "front-right", "rgbd-color"],
  );
  assert.deepEqual(
    resolveMasterTrackLayout({ mode: "focus", cameraId: "front-right" }, publications).map((slot) => slot.id),
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

test("wall subscribes to every approved H264 camera track", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions({ mode: "wall" }, publicationsForHybridTracks()),
    [
      { trackSid: "wall-sid", subscribe: false },
      { trackSid: "front-main-sid", subscribe: true },
      { trackSid: "front-left-sid", subscribe: true },
      { trackSid: "front-right-sid", subscribe: true },
      { trackSid: "rgbd-color-sid", subscribe: true },
    ],
  );
});

test("focus keeps approved H264 tracks subscribed so publication replacement cannot race the view", () => {
  assert.deepEqual(
    desiredMasterTrackSubscriptions(
      { mode: "focus", cameraId: "front-right" },
      publicationsForHybridTracks(),
    ),
    [
      { trackSid: "wall-sid", subscribe: false },
      { trackSid: "front-main-sid", subscribe: true },
      { trackSid: "front-left-sid", subscribe: true },
      { trackSid: "front-right-sid", subscribe: true },
      { trackSid: "rgbd-color-sid", subscribe: true },
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
