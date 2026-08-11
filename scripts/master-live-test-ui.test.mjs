import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMasterLiveTestPayload,
  getCodeCheckingRobotOptions,
  masterLiveTestPresentation,
  selectCodeCheckingRobotModel,
} from "../lib/master-live-test-ui.ts";

const normalModels = ["Aegies", "Navi"];

test("Master is absent unless the server grants the account capability", () => {
  assert.deepEqual(getCodeCheckingRobotOptions(normalModels, false), ["Aegies", "Navi"]);
  assert.deepEqual(getCodeCheckingRobotOptions(normalModels, true), ["Aegies", "Navi", "Master"]);
});

test("Master selection is accepted only with server-granted access and never changes the normal model", () => {
  assert.deepEqual(selectCodeCheckingRobotModel("Master", true, "Navi"), {
    normalRobotModel: "Navi",
    masterLiveTestSelected: true,
  });
  assert.deepEqual(selectCodeCheckingRobotModel("Master", false, "Navi"), {
    normalRobotModel: "Navi",
    masterLiveTestSelected: false,
  });
  assert.deepEqual(selectCodeCheckingRobotModel("Aegies", true, "Navi"), {
    normalRobotModel: "Aegies",
    masterLiveTestSelected: false,
  });
});

test("arbitrary Master text is sent unchanged and without an executable command list", () => {
  const rawText = "rm -rf /\nAgentech.forward(999)\nnot Python";
  assert.deepEqual(buildMasterLiveTestPayload(rawText, "notes.txt"), {
    code: rawText,
    uploadedFileName: "notes.txt",
  });
});

test("the unlocked presentation is explicitly view-only and opens the existing Master live page", () => {
  assert.deepEqual(masterLiveTestPresentation("2026-08-11T18:30:00.000Z"), {
    actionLabel: "Start 30-Minute Master Live Test",
    artifactLabel: "View-only test artifact",
    liveLinkLabel: "Open Master Live Stream",
    livePath: "/agentech-products/eaic-hub/watch-live-run",
    expiresAt: "2026-08-11T18:30:00.000Z",
    viewOnlyNotice: "View-only test. Submitted text will not execute on Master.",
  });
});
