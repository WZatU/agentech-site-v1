import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  endSessionCleanupPolicy,
  finalSessionDatabaseStatus,
  keepsStreamActive,
  requiresEndLieDown,
} from "./robot-stream-session-policy.mjs";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const compiler = join(scriptsDir, "compile-robot-plan.py");
const bridge = join(scriptsDir, "robot-stream-bridge.mjs");
const naviRunner = join(scriptsDir, "trusted-navi-runner.py");
const python = process.env.ROBOT_LOCAL_PYTHON || (process.platform === "win32" ? "python" : "python3");

function compile(source, robotModel) {
  const directory = mkdtempSync(join(tmpdir(), "agentech-plan-"));
  const sourcePath = join(directory, "reviewed.py");
  const planPath = join(directory, "plan.json");
  writeFileSync(sourcePath, source, "utf8");
  const args = [compiler, sourcePath, "submission-test"];
  if (robotModel) args.push(robotModel);
  args.push(planPath);
  const result = spawnSync(python, args, { encoding: "utf8" });
  return {
    status: result.status,
    stderr: result.stderr,
    plan: result.status === 0 ? JSON.parse(readFileSync(planPath, "utf8")) : null,
  };
}

test("compiler turns literal Agentech calls into an inert plan", () => {
  const source = [
    "from agentech import Agentech",
    "Agentech.stand()",
    "Agentech.forward(speed_mps=0.3, duration_s=1.0)",
    "Agentech.capture_image(output=\"capture.jpg\", source=\"default\")"
  ].join("\n");
  const result = compile(source);
  assert.equal(result.status, 0);
  const { plan } = result;

  assert.equal(plan.version, 2);
  assert.equal(plan.robot_model, "aegis");
  assert.equal(plan.submission_id, "submission-test");
  assert.equal(plan.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.deepEqual(plan.commands.map(({ name }) => name), ["stand", "forward", "capture_image"]);
  assert.equal("source" in plan, false);
});

test("Aegies compiler accepts body sensing and hold but rejects absent battery", () => {
  const source = [
    "from agentech import Agentech",
    "Agentech.stay(duration_s=1.0)",
    "Agentech.get_body_state()",
    "Agentech.capture_image(output=\"capture.jpg\", source=\"default\")"
  ].join("\n");
  const result = compile(source);
  assert.equal(result.status, 0);
  const { plan } = result;

  assert.deepEqual(plan.commands, [
    { name: "stay", args: { duration_s: 1 }, line: 2 },
    { name: "get_body_state", args: {}, line: 3 },
    { name: "capture_image", args: { output: "capture.jpg", source: "default" }, line: 4 }
  ]);

  const battery = compile("from agentech import Agentech\nAgentech.get_battery_status()\n");
  assert.notEqual(battery.status, 0);
  assert.match(battery.stderr, /hardware_absent/);
});

test("Aegies compiler rejects session 37 diagonal before staging", () => {
  const result = compile(
    "from agentech import Agentech\nAgentech.diagonal(angle_deg=45, speed_mps=0.10, duration_s=0.50)\n",
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /lateral component/);
});

test("Aegies compiler normalizes session 38 left turn and preserves source args", () => {
  const result = compile(
    "from agentech import Agentech\nAgentech.turn(angle_deg=-10, turn_rate_deg_s=-10)\n",
  );
  assert.equal(result.status, 0);
  assert.deepEqual(result.plan.commands[0], {
    name: "turn",
    args: { angle_deg: -10, turn_rate_deg_s: 10 },
    source_args: { angle_deg: -10, turn_rate_deg_s: -10 },
    line: 2,
  });
});

test("Aegies compiler rejects removed website-only battery and IMU names", () => {
  for (const source of [
    "from agentech import Agentech\nAgentech.battery()\n",
    "from agentech import Agentech\nAgentech.imu(freq_hz=5)\n",
  ]) {
    const result = compile(source);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unapproved command/);
  }
});

test("compiler creates a model-bound Navi plan from exact SDK calls", () => {
  const source = [
    "from agentech import Agentech",
    "Agentech.stand()",
    "Agentech.forward(speed_mps=0.5, duration_s=1.0)",
    "Agentech.wave_hand()"
  ].join("\n");
  const result = compile(source, "Navi");
  assert.equal(result.status, 0);
  const { plan } = result;

  assert.equal(plan.version, 2);
  assert.equal(plan.robot_model, "navi");
  assert.deepEqual(plan.commands.map(({ name }) => name), ["stand", "forward", "wave_hand"]);
  execFileSync(python, [naviRunner, "--validate", writePlan(plan)]);
});

function writePlan(plan) {
  const directory = mkdtempSync(join(tmpdir(), "agentech-navi-plan-"));
  const planPath = join(directory, "plan.json");
  writeFileSync(planPath, JSON.stringify(plan), "utf8");
  return planPath;
}

test("Navi compiler rejects Aegies-only capture commands", () => {
  const result = compile("from agentech import Agentech\nAgentech.capture_image(output=\"capture.jpg\", source=\"default\")\n", "Navi");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not approved/);
});

test("Navi compiler accepts only cardinal return-to-home headings", () => {
  const source = [
    "from agentech import Agentech",
    "Agentech.return_to_home(facing_angle_deg=270)"
  ].join("\n");
  const result = compile(source, "Navi");
  assert.equal(result.status, 0);
  const { plan } = result;

  assert.deepEqual(plan.commands, [
    { name: "return_to_home", args: { facing_angle_deg: 270 }, line: 2 }
  ]);
  execFileSync(python, [naviRunner, "--validate", writePlan(plan)]);
  const rejected = compile(
    "from agentech import Agentech\nAgentech.return_to_home(facing_angle_deg=45)\n",
    "Navi"
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /must be 0, 90, 180, or 270/);
});

test("compiler rejects loops and nonliteral customer execution", () => {
  const result = compile("for _ in range(2):\n    Agentech.forward(speed_mps=0.3, duration_s=1.0)\n");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only direct robot command calls are executable/);
});

test("gateway transfers only trusted runtime files and persists device results", () => {
  const source = readFileSync(bridge, "utf8");
  assert.match(source, /run\("scp", \[\.\.\.sshArgs\(\), planPath, trustedRunner, deviceResultsSerializer,/);
  assert.doesNotMatch(source, /run\("scp", \[\.\.\.sshArgs\(\), sourcePath,/);
  assert.match(source, /customer source is never sent to the robot/);
  assert.match(source, /async function claimSession/);
  assert.match(source, /spawn\(localPython, \[trustedNaviRunner, item\.localPlan\]/);
  assert.match(source, /"--return-home-and-damp"/);
  assert.match(source, /"--damp"/);
  assert.match(source, /if \(!active\) await stopObs\(\)/);
  assert.match(source, /if \(!active\) await stopObsVirtualCamera\(\)/);
  assert.doesNotMatch(source, /readFileSync\(item\.localPlan/);
  assert.match(source, /session robot model does not match its reviewed submission/);
  assert.match(source, /remoteResults/);
  assert.match(source, /collectDeviceResults/);
  assert.match(source, /syncDeviceResults/);
  assert.match(source, /buildDeviceResultsPatch/);
});

test("session policy selects model-specific scheduled-end cleanup", () => {
  assert.equal(requiresEndLieDown({ commands: [{ name: "stand" }] }, "navi"), true);
  assert.equal(
    requiresEndLieDown({ commands: [{ name: "lie_down" }, { name: "wave_hand" }] }, "navi"),
    true,
  );
  assert.equal(requiresEndLieDown({ commands: [{ name: "lie_down" }] }, "navi"), false);
  assert.equal(requiresEndLieDown({ commands: [{ name: "sit" }] }, "aegis"), false);
  assert.deepEqual(
    endSessionCleanupPolicy({ commands: [{ name: "stand" }] }, "navi"),
    { required: true, returnHomeRequired: true },
  );
  assert.deepEqual(
    endSessionCleanupPolicy(
      { commands: [{ name: "return_to_home" }, { name: "wave_hand" }] },
      "navi",
    ),
    { required: true, returnHomeRequired: false },
  );
  assert.deepEqual(
    endSessionCleanupPolicy({ commands: [{ name: "sit" }] }, "aegis"),
    { required: false, returnHomeRequired: false },
  );
  assert.equal(
    keepsStreamActive(
      { status: "completed", end: "2026-07-20T20:05:00Z" },
      Date.parse("2026-07-20T20:04:59Z"),
    ),
    true,
  );
  assert.equal(
    keepsStreamActive(
      { status: "completed", end: "2026-07-20T20:05:00Z" },
      Date.parse("2026-07-20T20:05:00Z"),
    ),
    false,
  );
});

test("session policy publishes a final database status from stream delivery only", () => {
  assert.equal(finalSessionDatabaseStatus({ status: "running" }), null);
  assert.equal(
    finalSessionDatabaseStatus({
      status: "finished",
      streamAvailableDuringSession: true,
      endCleanupRequired: true,
      endCleanupStatus: "failed",
      endCleanupAttempts: 3,
    }),
    "completed",
  );
  assert.equal(
    finalSessionDatabaseStatus({
      status: "finished",
      streamAvailableDuringSession: false,
      endCleanupRequired: false,
    }),
    "failed",
  );
  assert.equal(
    finalSessionDatabaseStatus({
      status: "finished",
      endCleanupRequired: true,
      endCleanupStatus: "failed",
      endCleanupAttempts: 3,
    }),
    "completed",
  );
});
