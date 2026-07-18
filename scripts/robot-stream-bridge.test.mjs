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
const python = process.env.ROBOT_LOCAL_PYTHON || (process.platform === "win32" ? "python" : "python3");

function compile(source) {
  const directory = mkdtempSync(join(tmpdir(), "agentech-plan-"));
  const sourcePath = join(directory, "reviewed.py");
  const planPath = join(directory, "plan.json");
  writeFileSync(sourcePath, source, "utf8");
  execFileSync(python, [compiler, sourcePath, "submission-test", planPath]);
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
});
