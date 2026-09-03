import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceRoot = new URL("../", import.meta.url);

async function readWorkspaceFile(path: string) {
  return readFile(new URL(path, workspaceRoot), "utf8");
}

test("the coming soon robot exposes English copy and stable scene hooks", async () => {
  const component = await readWorkspaceFile("components/coming-soon-robot.tsx");

  for (const copy of [
    "COMING SOON",
    "Building at full speed.",
    "Our little engineer is wiring up this page. Check back soon.",
    "Oh—hi! You caught me building."
  ]) {
    assert.match(component, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(
    component,
    /[\u3400-\u9fff]/,
    "customer-facing component copy must stay English-only"
  );

  for (const hook of [
    "data-coming-soon-robot",
    "data-coming-soon-copy",
    "data-coming-soon-scene",
    "data-coming-soon-speech",
    "data-coming-soon-head",
    "data-coming-soon-visor",
    "data-coming-soon-drawing-arm",
    "data-coming-soon-wave-arm",
    "data-coming-soon-scanner",
    "data-coming-soon-status-light"
  ]) {
    assert.match(component, new RegExp(hook));
  }

  assert.match(component, /tabIndex=\{0\}/);
  assert.match(component, /aria-label="Wireframe robot building this page"/);
  assert.match(component, /<svg[\s\S]*aria-hidden="true"/);
});
