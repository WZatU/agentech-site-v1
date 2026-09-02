import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspaceRoot = new URL("../", import.meta.url);

async function readWorkspaceFile(path: string) {
  return readFile(new URL(path, workspaceRoot), "utf8");
}

test("major Agentech landing pages expose dedicated theme scopes", async () => {
  const [education, robotics, talents] = await Promise.all([
    readWorkspaceFile("app/agentech-education/page.tsx"),
    readWorkspaceFile("app/agentech-robotic/page.tsx"),
    readWorkspaceFile("app/talents/page.tsx")
  ]);

  assert.match(education, /education-eaic-page/);
  assert.match(robotics, /robotics-theme-page/);
  assert.match(talents, /talents-theme-page/);
});

test("each landing page has a complete warm light palette", async () => {
  const css = await readWorkspaceFile("app/globals.css");

  for (const scope of ["education-eaic-page", "robotics-theme-page", "talents-theme-page"]) {
    assert.match(css, new RegExp(`:root\\[data-theme=\\"light\\"\\] \\.${scope.replace(/-/g, "\\-")}`));
  }

  assert.match(css, /#f5f4f1/i);
  assert.match(css, /#1a73e8/i);
});

test("the light robotics hero keeps the robot crisp while protecting the left-side copy", async () => {
  const [page, css] = await Promise.all([
    readWorkspaceFile("app/agentech-robotic/page.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.match(page, /data-robotics-hero-image/);
  assert.match(
    css,
    /:root\[data-theme="light"\] \.robotics-theme-page \[data-robotics-hero-image\]\s*\{[^}]*opacity:\s*0\.92\s*!important;[^}]*filter:\s*contrast\(1\.08\)\s+saturate\(0\.96\)\s*!important;/
  );
  assert.match(
    css,
    /\[data-robotics-hero-overlay\][^{]*\{[^}]*linear-gradient\(90deg,[^}]*rgba\(245, 244, 241, 0\.08\)[^}]*transparent/
  );
});

test("robotics specification values use the finer mono treatment", async () => {
  const page = await readWorkspaceFile("app/agentech-robotic/page.tsx");

  assert.match(page, /data-robotics-spec-value/);
  assert.match(
    page,
    /data-robotics-spec-value[^>]*className=\{`[^`]*text-xs[^`]*font-normal[^`]*tracking-\[0\.08em\]/
  );
});

test("robot product images use the same softened corner radius as the specification panel", async () => {
  const page = await readWorkspaceFile("app/agentech-robotic/page.tsx");

  assert.match(page, /data-robotics-product-image/);
  assert.match(
    page,
    /data-robotics-product-image[^>]*className="[^"]*rounded-lg[^"]*"/
  );
});

test("robotics runtime level cards match the specification panel corner radius", async () => {
  const page = await readWorkspaceFile("app/agentech-robotic/page.tsx");

  assert.match(
    page,
    /data-robotics-runtime-level[^>]*className="[^"]*rounded-lg[^"]*"/
  );
});

test("the Navi feature card becomes white with black type only in the light theme", async () => {
  const [tabs, css] = await Promise.all([
    readWorkspaceFile("components/education-program-tabs.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  for (const hook of [
    "data-education-navi-card",
    "data-education-navi-media",
    "data-education-navi-overlay",
    "data-education-navi-kicker",
    "data-education-navi-title"
  ]) {
    assert.match(tabs, new RegExp(hook));
  }

  assert.match(
    css,
    /:root\[data-theme="light"\] \.education-eaic-page \[data-education-navi-card\][^{]*\{[^}]*background:\s*#ffffff\s*!important;/
  );
  assert.match(
    css,
    /:root\[data-theme="light"\] \.education-eaic-page \[data-education-navi-title\][^{]*\{[^}]*color:\s*#111111\s*!important;/
  );
});

test("the high-school program logo becomes black only in the light theme", async () => {
  const [tabs, css] = await Promise.all([
    readWorkspaceFile("components/education-program-tabs.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.match(tabs, /data-education-program-logo/);
  assert.match(css, /:root\[data-theme="light"\] \.education-eaic-page \[data-education-program-logo\]/);
  assert.match(css, /filter:\s*brightness\(0\)/);
});

test("the light theme keeps the global navigation solid and crisp", async () => {
  const [header, css] = await Promise.all([
    readWorkspaceFile("components/site-header.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.match(header, /data-site-header/);
  assert.match(
    css,
    /:root\[data-theme="light"\] \[data-site-header\][^{]*\{[^}]*background:\s*#050505\s*!important;[^}]*backdrop-filter:\s*none\s*!important;/
  );
  assert.match(
    css,
    /:root\[data-theme="light"\] \[data-site-header\] \.agent-nav-wordmark[^{]*\{[^}]*color:\s*#f3f4f6;/
  );
  assert.match(
    css,
    /:root\[data-theme="light"\] \[data-site-header\] \.agent-nav-wordmark\.is-active[^{]*[\s\S]*?text-shadow:\s*none;/
  );
});

test("EAIC workflow SDK accent stays as vivid and readable as the other dark steps", async () => {
  const { workflowAccentPalette, contrastRatio } = await import("./eaic-workflow-palette.ts");
  const sdkAccent = workflowAccentPalette[1].dark;
  const peerAccents = workflowAccentPalette.filter((_, index) => index !== 1).map(({ dark }) => dark);
  const channelSpread = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map((channel) => Number.parseInt(channel, 16));
    return Math.max(...channels) - Math.min(...channels);
  };

  // Keep the blue accent in the existing steps' intensity range, not washed out or overpowering.
  const peerSpreads = peerAccents.map(channelSpread);
  assert.ok(channelSpread(sdkAccent) >= Math.min(...peerSpreads), "Step 02 must not look grayer than every peer");
  assert.ok(channelSpread(sdkAccent) <= Math.max(...peerSpreads), "Step 02 must not overpower the other accents");

  const peerContrast = peerAccents.map((color) => contrastRatio(color, "#050b10"));
  const sdkContrast = contrastRatio(sdkAccent, "#050b10");
  assert.ok(sdkContrast >= Math.min(...peerContrast), "Step 02 must not be dimmer than every peer");
  assert.ok(sdkContrast <= Math.max(...peerContrast), "Step 02 must stay within the existing brightness range");
});

test("EAIC workflow light accents keep their hues while meeting AA contrast on white", async () => {
  const [paletteModule, css] = await Promise.all([
    import("./eaic-workflow-palette.ts").catch(() => null),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.ok(paletteModule, "EAIC workflow palette must be available");
  assert.deepEqual(
    paletteModule.workflowAccentPalette.map(({ light }) => light),
    ["#007d6f", "#365f91", "#c85016", "#6f42c1"]
  );

  for (const { light } of paletteModule.workflowAccentPalette) {
    assert.ok(paletteModule.contrastRatio(light, "#ffffff") >= 4.5, `${light} must remain readable on white`);
  }

  assert.match(
    css,
    /:root\[data-theme="light"\] \.eaic-engineering-theme \[data-workflow-accent-box\][^{]*\{[^}]*border-color:\s*var\(--workflow-accent\);/
  );
});

test("page-level actions and navigation interactions share a twelve-pixel radius", async () => {
  const [home, educationTabs, talents, header, css] = await Promise.all([
    readWorkspaceFile("features/eaic/01-clients/eaic-hub/components/agentech-library-home.tsx"),
    readWorkspaceFile("components/education-program-tabs.tsx"),
    readWorkspaceFile("app/talents/page.tsx"),
    readWorkspaceFile("components/site-header.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.match(home, /data-eaic-primary-action[^>]*[\s\S]*?rounded-xl/);
  assert.match(home, /data-eaic-secondary-action[^>]*[\s\S]*?rounded-xl/);
  assert.match(header, /agent-nav-link rounded-xl/);
  assert.doesNotMatch(css, /\.agent-nav-link\s*\{[^}]*border-radius:\s*999px;/);
  assert.match(educationTabs, /data-theme-primary-action[^>]*[\s\S]*?rounded-xl/);
  assert.match(talents, /data-theme-primary-action[^>]*[\s\S]*?rounded-xl/g);
  assert.match(talents, /data-theme-secondary-action[^>]*[\s\S]*?rounded-xl/);
  assert.match(talents, /data-page-cta[^>]*[\s\S]*?rounded-xl/);
});

test("all K-8 grade landing pages expose a complete dark theme scope", async () => {
  const [gradePage, css] = await Promise.all([
    readWorkspaceFile("app/agentech-education/[grade]/page.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.match(gradePage, /education-grade-theme/);
  assert.match(css, /:root\[data-theme="dark"\] \.education-grade-theme/);
  assert.match(css, /\.education-grade-theme \[data-course-card\]/);
});

test("the Future Founder immersion page exposes a complete dark theme scope", async () => {
  const [page, css] = await Promise.all([
    readWorkspaceFile("components/eai-immersion-landing-page.tsx"),
    readWorkspaceFile("app/globals.css")
  ]);

  assert.match(page, /data-ff-theme-page/);
  assert.match(page, /ff-hero/);
  assert.match(css, /:root\[data-theme="dark"\] \.ff-immersion/);
  assert.match(css, /\.ff-immersion > section:not\(\.ff-hero\)/);
  assert.match(css, /\.ff-immersion \[class\*="bg-\[#fbfaf7\]"\]/);
});
