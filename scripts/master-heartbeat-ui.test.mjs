import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(new URL("../features/eaic/01-clients/eaic-hub/components/master-heartbeat.tsx", import.meta.url), "utf8");
const workbench = await readFile(new URL("../features/eaic/01-clients/eaic-hub/components/agentech-library-workbench.tsx", import.meta.url), "utf8");
const motorMap = await readFile(new URL("../features/eaic/01-clients/eaic-hub/components/master-motor-map.tsx", import.meta.url), "utf8");

test("Master SDK mounts the live heartbeat next to the existing motor map", () => {
  assert.match(workbench, /<MasterHeartbeat \/>/);
  assert.match(workbench, /<MasterMotorMap \/>/);
  assert.match(workbench, /<MasterJointMotionGuide \/>/);
});

test("heartbeat panel exposes only gateway, availability and last update", () => {
  for (const label of ["Gateway", "Robot availability", "Last updated"]) {
    assert.match(component, new RegExp(`\\["${label}"`));
  }
  assert.match(component, /role="status"/);
  assert.match(component, /aria-live="polite"/);
  assert.doesNotMatch(component, /\["(?:Battery|Mode|Master controller)"/);
  assert.match(component, /setInterval\(refresh, 60_000\)/);
  assert.match(component, /sm:grid-cols-3/);
  assert.match(component, /<p data-master-heartbeat-label="true"[^>]*>Checked hourly/);
});

test("front and back joint artwork remains present", () => {
  assert.match(motorMap, /agibot-x2-sketch-front\.png/);
  assert.match(motorMap, /agibot-x2-sketch-back\.png/);
});
