import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

const root = new URL("../", import.meta.url);
const page = await readFile(new URL("app/account/page.tsx", root), "utf8");
const dashboard = await readFile(new URL("components/account-dashboard.tsx", root), "utf8");
const css = await readFile(new URL("app/account/account-workspace.css", root), "utf8").catch(() => "");
const sheet = postcss.parse(css);

function declarations(selector) {
  const result = {};
  sheet.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls((decl) => { result[decl.prop] = decl.value; });
    }
  });
  return result;
}

test("Account opts into its own theme without nesting a main landmark or forcing light", () => {
  assert.match(page, /data-account-workspace/);
  assert.match(page, /import "\.\/account-workspace\.css"/);
  assert.doesNotMatch(page, /account-white-page|<main\b|bg-\[#f6f8fc\]/);
  assert.equal(declarations("[data-account-workspace]").background, "var(--color-canvas)");
});

test("account title, interface, and technical metrics have explicit font responsibilities", () => {
  assert.match(dashboard, /data-account-title/);
  assert.match(declarations("[data-account-workspace] [data-account-title]")["font-family"], /--font-brand/);
  assert.match(declarations("[data-account-workspace]")["font-family"], /--font-sans/);
  const metric = declarations("[data-account-workspace] [data-account-metric-value]");
  assert.match(metric["font-family"], /--font-mono/);
  assert.equal(metric["font-weight"], "500", "Plex Mono is loaded only at 400/500");
});

test("overview and controls use flat surfaces and consistent 12px corners", () => {
  assert.equal(declarations("[data-account-workspace] [data-account-shell]").background, "transparent");
  assert.equal(declarations("[data-account-workspace] [data-account-metric]")["box-shadow"], "none");
  const primary = declarations('[data-account-workspace] [data-account-action="primary"]');
  assert.equal(primary["background-color"], "var(--account-action-bg)");
  assert.equal(primary.color, "var(--account-action-text)");
  assert.equal(primary["border-radius"], "12px");
  assert.equal(primary["box-shadow"], "none");
  assert.equal(declarations("[data-account-workspace] :is(button, a)")["border-radius"], "12px", "Code-review actions also need the shared radius");
});

test("navigation has an accessible selected state and a single account avatar/sign-out location", () => {
  assert.match(dashboard, /data-account-tab/);
  assert.match(dashboard, /aria-pressed=\{selected\}/);
  assert.equal(declarations("[data-account-workspace] [data-account-tab-mark]").display, "none");
  assert.equal(declarations("[data-account-workspace] [data-account-duplicate-avatar]").display, "none");
  assert.equal(declarations("[data-account-workspace] [data-account-local-signout]").display, "none");
});

test("dark and light controls and status colors are explicit and route scoped", () => {
  const light = declarations(':root[data-theme="light"] [data-account-workspace]');
  const dark = declarations("[data-account-workspace]");
  assert.equal(light["--account-action-bg"], "#111111");
  assert.equal(dark["--account-action-bg"], "#e5edf5");
  for (const token of ["--account-warning-surface", "--account-danger-surface"]) {
    assert.ok(dark[token]);
    assert.notEqual(light[token], dark[token]);
  }
  sheet.walkRules((rule) => {
    assert.ok(rule.selector.includes("data-account-workspace"), `Unscoped rule: ${rule.selector}`);
  });
});

test("visual changes retain account actions and development-only fixture guard", () => {
  for (const handler of ["saveAccount", "cancelEditingAccount", "startEditingAccount", "startCreditRecharge"]) {
    assert.ok(dashboard.includes(`onClick={${handler}}`));
  }
  assert.match(dashboard, /process\.env\.NODE_ENV !== "production"[\s\S]{0,130}previewProfile/);
});

test("profile decoration stays neutral and a closed mobile drawer cannot cast a veil", () => {
  assert.ok(dashboard.includes("data-account-profile-icon"));
  assert.equal(declarations("[data-account-workspace] [data-account-profile-icon]").color, "var(--color-text-muted)");
  const drawer = declarations('body:has([data-account-workspace]) [data-site-header]:has(button[aria-expanded="false"]) aside');
  assert.equal(drawer.visibility, "hidden");
  assert.equal(drawer["box-shadow"], "none");
});
