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
    "data-coming-soon-machine",
    "data-coming-soon-illustration",
    "data-coming-soon-overlay",
    "data-coming-soon-workbench",
    "data-coming-soon-draft-path",
    "data-coming-soon-orbit",
    "data-coming-soon-scanner",
    "data-coming-soon-status-light"
  ]) {
    assert.match(component, new RegExp(hook));
  }

  assert.match(component, /tabIndex=\{0\}/);
  assert.match(component, /aria-label="Wireframe robot building this page"/);
  assert.match(component, /<svg[\s\S]*aria-hidden="true"/);
});

test("the illustration uses the detailed 3D humanoid and a perspective workbench", async () => {
  const [component, css] = await Promise.all([
    readWorkspaceFile("components/coming-soon-robot.tsx"),
    readWorkspaceFile("components/coming-soon-robot.css")
  ]);

  assert.match(
    css,
    /url\("\/assets\/products\/agentech-library\/humanoid-wireframe-dark-v1\.png"\)/
  );
  assert.match(
    css,
    /url\("\/assets\/products\/agentech-library\/humanoid-wireframe-light-v1\.png"\)/
  );
  assert.match(component, /viewBox="0 0 1254 1254"/);
  assert.match(component, /data-coming-soon-workbench[\s\S]*data-coming-soon-draft-path/);
  assert.doesNotMatch(component, /viewBox="0 0 760 620"/);
  assert.doesNotMatch(component, /data-coming-soon-eyes/);
  assert.match(css, /perspective:\s*\d+px/);
  assert.match(css, /transform-style:\s*preserve-3d/);
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

  for (const name of ["draft", "scan", "machine", "breathe", "orbit", "spark"]) {
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
