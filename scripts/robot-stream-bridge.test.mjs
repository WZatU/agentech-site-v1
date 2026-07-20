import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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
  execFileSync(python, args);
  return JSON.parse(readFileSync(planPath, "utf8"));
}

test("compiler turns literal Agentech calls into an inert plan", () => {
  const source = [
    "from agentech import Agentech",
    "Agentech.stand()",
    "Agentech.forward(speed_mps=0.3, duration_s=1.0)",
    "Agentech.capture_image(mode=\"display\")"
  ].join("\n");
  const plan = compile(source);

  assert.equal(plan.version, 1);
  assert.equal(plan.submission_id, "submission-test");
  assert.equal(plan.source_sha256, createHash("sha256").update(source).digest("hex"));
  assert.deepEqual(plan.commands.map(({ name }) => name), ["stand", "forward", "capture_image"]);
  assert.equal("source" in plan, false);
});

test("compiler creates a model-bound Navi plan from exact SDK calls", () => {
  const source = [
    "from agentech import Agentech",
    "Agentech.stand()",
    "Agentech.forward(speed_mps=0.5, duration_s=1.0)",
    "Agentech.wave_hand()"
  ].join("\n");
  const plan = compile(source, "Navi");

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
  assert.throws(() => compile("from agentech import Agentech\nAgentech.capture_image(mode=\"display\")\n", "Navi"));
});

test("compiler rejects loops and nonliteral customer execution", () => {
  const directory = mkdtempSync(join(tmpdir(), "agentech-plan-reject-"));
  const sourcePath = join(directory, "reviewed.py");
  const planPath = join(directory, "plan.json");
  writeFileSync(sourcePath, "for _ in range(2):\n    Agentech.forward(speed_mps=0.3, duration_s=1.0)\n", "utf8");

  const result = spawnSync(python, [compiler, sourcePath, "submission-reject", planPath], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
});

test("gateway transfers only the plan and trusted runner", () => {
  const source = readFileSync(bridge, "utf8");
  assert.match(source, /run\("scp", \[\.\.\.sshArgs\(\), planPath, trustedRunner,/);
  assert.doesNotMatch(source, /run\("scp", \[\.\.\.sshArgs\(\), sourcePath,/);
  assert.match(source, /customer source is never sent to the robot/);
  assert.match(source, /async function claimSession/);
  assert.match(source, /spawn\(localPython, \[trustedNaviRunner, item\.localPlan\]/);
  assert.match(source, /session robot model does not match its reviewed submission/);
});
