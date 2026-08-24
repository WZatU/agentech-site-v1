import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const componentPath = join(root, "features", "eaic", "01-clients", "eaic-hub", "components", "master-joint-motion-guide.tsx");
const component = readFileSync(componentPath, "utf8");
const expected = [
  "shoulder-pitch",
  "shoulder-roll",
  "shoulder-yaw",
  "elbow",
  "wrist-pitch",
  "wrist-roll",
  "wrist-yaw",
  "head-pitch",
  "head-yaw"
];

test("Master guide exposes all nine supported joint-axis demonstrations", () => {
  for (const id of expected) {
    assert.match(component, new RegExp(`id: \\\"${id}\\\"`));
  }
  assert.equal((component.match(/ id: "/g) ?? []).length, expected.length);
  assert.match(component, /Left-arm joints use the same axes, mirrored/);
  assert.match(component, /educational simulation/);
});

test("every Master guide demonstration has a rendered MP4", () => {
  const assetRoot = join(root, "public", "assets", "products", "agentech-library", "simulator-previews", "master", "joint-axes");
  for (const id of expected) {
    const asset = join(assetRoot, `master-${id}.mp4`);
    assert.equal(existsSync(asset), true, `${id} preview is missing`);
    assert.ok(statSync(asset).size > 100_000, `${id} preview is unexpectedly small`);
  }
});

test("guide identifies the official model source", () => {
  assert.match(component, /Official AgiBot X2 MuJoCo model/);
  const source = readFileSync(join(root, "public", "assets", "products", "agentech-library", "simulator-previews", "master", "joint-axes", "SOURCE.md"), "utf8");
  assert.match(source, /github\.com\/AgibotTech\/agibot_x2_urdf/);
  assert.match(source, /77f43eb0904dae4c48ccd9154fee824f8ffd4d38/);
});

test("arm demonstrations use collision-safe clearance poses", () => {
  const renderer = readFileSync(join(root, "scripts", "simulator-previews", "master", "render_master_joint_axes.py"), "utf8");
  assert.match(renderer, /SAFE_ARM_POSES/);
  assert.match(renderer, /"right_shoulder_roll_joint": -0\.42/);
  assert.match(renderer, /set_joint_value\(model, data, pose_joint, pose_value\)/);
  assert.match(renderer, /value .* is outside/);
  assert.match(component, /precise-joints-20260820/);
  assert.match(renderer, /if key in \{"elbow", "shoulder-yaw"\}/);
  assert.match(renderer, /mjtGeom\.mjGEOM_SPHERE/);
  assert.match(renderer, /0\.48 \* \(data\.xanchor\[elbow_id\] - start\)/);
});
