import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss, { type AtRule, type Rule } from "postcss";

const workspaceRoot = new URL("../", import.meta.url);

async function readWorkspaceFile(path: string) {
  return readFile(new URL(path, workspaceRoot), "utf8");
}

function declarationMap(css: string, selector: string, media?: string) {
  const values: Record<string, string> = {};
  const sheet = postcss.parse(css);

  sheet.walkRules((rule: Rule) => {
    const parentMedia = rule.parent?.type === "atrule" && (rule.parent as AtRule).name === "media"
      ? (rule.parent as AtRule).params
      : undefined;

    if (rule.selectors.includes(selector) && parentMedia === media) {
      rule.walkDecls((declaration) => {
        values[declaration.prop] = declaration.value;
      });
    }
  });

  return values;
}

test("phone header keeps every theme target at 44px while preserving room for the brand", async () => {
  const [header, brand, css] = await Promise.all([
    readWorkspaceFile("components/site-header.tsx"),
    readWorkspaceFile("components/brand-mark.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  assert.match(header, /data-site-header-inner/);
  assert.match(brand, /data-site-brand-image/);
  assert.match(brand, /priority/);
  assert.equal(
    declarationMap(css, ".theme-switcher-mobile-header .theme-switcher-option", "(max-width: 639px)").width,
    "44px",
  );
  assert.equal(
    declarationMap(css, ".theme-switcher-mobile-header .theme-switcher-option", "(max-width: 639px)").height,
    "44px",
  );
  assert.equal(
    declarationMap(css, "[data-site-brand-image]", "(max-width: 359px)").width,
    "6rem",
  );
});

test("education carousel uses a compact phone frame with accessible controls", async () => {
  const [tabs, css] = await Promise.all([
    readWorkspaceFile("components/education-program-tabs.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  for (const hook of [
    "data-education-program-media",
    "data-education-carousel-controls",
    "data-education-slide-control",
    "data-education-autoplay-control",
  ]) {
    assert.match(tabs, new RegExp(hook));
  }

  assert.equal(
    declarationMap(css, "[data-education-program-media]", "(max-width: 639px)")["min-height"],
    "248px",
  );
  assert.equal(
    declarationMap(css, "[data-education-slide-control]", "(max-width: 639px)")["min-width"],
    "44px",
  );
  assert.equal(
    declarationMap(css, "[data-education-slide-control]", "(max-width: 639px)")["min-height"],
    "44px",
  );
  assert.equal(
    declarationMap(css, "[data-education-autoplay-control]", "(max-width: 639px)").height,
    "44px",
  );
  assert.match(tabs, /group\/slide-control/);
  assert.match(tabs, /group-hover\/slide-control:bg-\[#123247\]/);
});

test("education Navi card blends its artwork into phone whitespace without reducing copy contrast", async () => {
  const css = await readWorkspaceFile("app/globals.css");
  const mediaQuery = "(max-width: 639px)";
  const artwork = declarationMap(
    css,
    ':root[data-theme="light"] .education-eaic-page [data-education-navi-media]',
    mediaQuery,
  );
  const overlay = declarationMap(
    css,
    ':root[data-theme="light"] .education-eaic-page [data-education-navi-overlay]',
    mediaQuery,
  );

  assert.equal(artwork.opacity, "0.96");
  assert.equal(artwork["object-position"], "82% center");
  assert.match(overlay.background, /#ffffff 0%, #ffffff 52%/);
  assert.match(overlay.background, /rgba\(255, 255, 255, 0\.08\) 100%/);
});

test("Navi language control belongs to the hero instead of covering scrolled copy", async () => {
  const [page, css] = await Promise.all([
    readWorkspaceFile("components/navi-learning-page.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  assert.match(page, /data-navi-language-toggle/);
  assert.match(
    page,
    /<section className="relative[^>]*">\s*<LanguageToggle[^>]+\/\>/,
  );
  const control = declarationMap(css, "[data-navi-language-toggle]");
  assert.equal(control.position, "absolute");
  assert.equal(control["min-height"], "44px");
  assert.notEqual(control.position, "fixed");
});

test("EAIC phone actions are equal-width and reserve a clear gap above the robot", async () => {
  const [home, css] = await Promise.all([
    readWorkspaceFile("features/eaic/01-clients/eaic-hub/components/agentech-library-home.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  assert.match(home, /data-eaic-hero-content/);
  assert.match(home, /data-eaic-hero-actions/);
  const actions = declarationMap(css, ".eaic-engineering-theme [data-eaic-hero-actions]", "(max-width: 639px)");
  const primary = declarationMap(css, ".eaic-engineering-theme [data-eaic-primary-action]", "(max-width: 639px)");
  const secondary = declarationMap(css, ".eaic-engineering-theme [data-eaic-secondary-action]", "(max-width: 639px)");
  const visual = declarationMap(css, ".eaic-engineering-theme [data-eaic-hero-visual]", "(max-width: 639px)");
  const content = declarationMap(css, ".eaic-engineering-theme [data-eaic-hero-content]", "(max-width: 639px)");
  const hero = declarationMap(css, ".eaic-engineering-theme [data-eaic-hero]", "(max-width: 639px)");

  assert.equal(actions["flex-direction"], "column");
  assert.equal(primary.width, "100%");
  assert.equal(primary["justify-content"], "center");
  assert.equal(secondary.width, "100%");
  assert.equal(secondary["justify-content"], "center");
  assert.match(content["padding-bottom"], /var\(--eaic-mobile-visual-height\)/);
  assert.equal(visual.height, "var(--eaic-mobile-visual-height)");
  assert.equal(hero["--eaic-mobile-visual-height"], "clamp(15rem, 32vh, 17.5rem)");
});

test("Talents light hero protects mobile copy and gives its actions a single-column rhythm", async () => {
  const [page, css] = await Promise.all([
    readWorkspaceFile("app/talents/page.tsx"),
    readWorkspaceFile("app/globals.css"),
  ]);

  assert.match(page, /data-talents-hero-copy/);
  assert.match(page, /data-talents-hero-body/);
  assert.match(page, /data-talents-hero-actions/);

  const overlay = declarationMap(
    css,
    ':root[data-theme="light"] .talents-theme-page [data-talents-hero-overlay]',
    "(max-width: 639px)",
  );
  const actions = declarationMap(css, "[data-talents-hero-actions]", "(max-width: 639px)");
  const actionLinks = declarationMap(css, "[data-talents-hero-actions] > a", "(max-width: 639px)");
  const body = declarationMap(
    css,
    ':root[data-theme="light"] .talents-theme-page [data-talents-hero-body]',
    "(max-width: 639px)",
  );

  assert.match(overlay.background, /rgba\(245, 244, 241, 0\.9\)/);
  assert.equal(actions["flex-direction"], "column");
  assert.equal(actions.width, "100%");
  assert.equal(actionLinks.width, "100%");
  assert.equal(body.color, "#344255");
});
