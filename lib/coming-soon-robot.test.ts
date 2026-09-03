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

test("the coming soon scene has scoped themes, interaction, and reduced motion", async () => {
  const css = await readWorkspaceFile("components/coming-soon-robot.css");

  assert.match(
    css,
    /\[data-coming-soon-robot\][^{]*\{[^}]*--coming-soon-canvas:\s*#07111f;/
  );
  assert.match(
    css,
    /:root\[data-theme="light"\] \[data-coming-soon-robot\][^{]*\{[^}]*--coming-soon-canvas:\s*#f5f4f1;/
  );

  for (const name of ["draw", "scan", "blink", "breathe", "look", "spark"]) {
    assert.match(css, new RegExp(`@keyframes coming-soon-${name}`));
  }

  assert.match(
    css,
    /\[data-coming-soon-scene\]:(?:hover|focus)[\s\S]*\[data-coming-soon-speech\]/
  );
  assert.match(css, /\[data-coming-soon-scene\]:focus-visible[^{]*\{[^}]*outline:/);
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none\s*!important;/
  );
});

test("the shared placeholder and preview route compose the robot without entering navigation", async () => {
  const [placeholder, route, sitemap] = await Promise.all([
    readWorkspaceFile("components/placeholder-page.tsx"),
    readWorkspaceFile("app/coming-soon/page.tsx"),
    readWorkspaceFile("app/sitemap.ts")
  ]);

  assert.match(
    placeholder,
    /import \{ ComingSoonRobot \} from "@\/components\/coming-soon-robot"/
  );
  assert.match(placeholder, /<ComingSoonRobot/);
  assert.match(placeholder, /eyebrow=\{title\}/);
  assert.match(placeholder, /headline\?: string/);
  assert.match(route, /<PlaceholderPage\s+title="COMING SOON"/);
  assert.match(route, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.doesNotMatch(sitemap, /coming-soon/);
});
