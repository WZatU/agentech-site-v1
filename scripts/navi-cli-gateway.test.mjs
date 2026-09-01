import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";


const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const compiler = join(scriptsDir, "compile-robot-plan.py");
const naviRunner = join(scriptsDir, "trusted-navi-runner.py");
const python = process.env.ROBOT_LOCAL_PYTHON || (process.platform === "win32" ? "python" : "python3");


test("CLI Navi code becomes a source-free plan accepted by the trusted runner", () => {
  const directory = mkdtempSync(join(tmpdir(), "agentech-cli-navi-"));
  const sourcePath = join(directory, "reviewed.py");
  const planPath = join(directory, "plan.json");
  const source = [
    "from agentech import Agentech",
    "Agentech.forward(speed_mps=0.3, duration_s=1.0)",
    "Agentech.bark(count=2)",
  ].join("\n");
  writeFileSync(sourcePath, source, "utf8");

  const compiled = spawnSync(
    python,
    [compiler, sourcePath, "cli-navi-submission", "Navi", planPath],
    { encoding: "utf8" },
  );

  assert.equal(compiled.status, 0, compiled.stderr);
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  assert.equal(plan.robot_model, "navi");
  assert.equal(plan.submission_id, "cli-navi-submission");
  assert.equal("source" in plan, false);
  assert.deepEqual(plan.commands.map(({ name }) => name), ["forward", "bark"]);
  execFileSync(python, [naviRunner, "--validate", planPath]);
});
