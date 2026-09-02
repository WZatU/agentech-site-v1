import assert from "node:assert/strict";
import test from "node:test";

test("normalizes, resolves, and cycles theme preferences", async () => {
  const theme = await import("./theme.ts").catch(() => null);

  assert.ok(theme, "theme helpers must exist");
  assert.equal(theme.normalizeThemeMode("light"), "light");
  assert.equal(theme.normalizeThemeMode("dark"), "dark");
  assert.equal(theme.normalizeThemeMode("invalid"), "system");
  assert.equal(theme.resolveThemeMode("system", true), "dark");
  assert.equal(theme.resolveThemeMode("system", false), "light");
  assert.equal(theme.resolveThemeMode("light", true), "light");
  assert.equal(theme.getNextTheme("system"), "light");
  assert.equal(theme.getNextTheme("light"), "dark");
  assert.equal(theme.getNextTheme("dark"), "system");
});

test("boot script honors saved themes and system fallback", async () => {
  const theme = await import("./theme.ts").catch(() => null);

  assert.ok(theme, "theme boot script must exist");
  assert.match(theme.themeBootScript, /localStorage\.getItem/);
  assert.match(theme.themeBootScript, /prefers-color-scheme: dark/);
  assert.match(theme.themeBootScript, /dataset\.theme/);
});

test("exposes the canonical system, light, and dark switcher options", async () => {
  const theme = await import("./theme.ts");

  assert.deepEqual(theme.THEME_OPTIONS, ["system", "light", "dark"]);
});
