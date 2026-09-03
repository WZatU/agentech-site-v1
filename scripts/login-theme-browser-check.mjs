import assert from "node:assert/strict";

function parseRgb(value) {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  assert.equal(channels?.length, 3, "expected an RGB color, received " + value);
  return channels;
}

function relativeLuminance(value) {
  return parseRgb(value)
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export async function checkLoginThemes(tab) {
  const readTheme = () => tab.playwright.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error("Missing login theme target: " + selector);
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        border: style.borderColor,
      };
    };

    return {
      theme: document.documentElement.dataset.theme,
      canvas: read("[data-login-canvas]"),
      heroTitle: read("[data-login-hero-title]"),
      card: read("[data-login-card]"),
      cardTitle: read("[data-login-card-title]"),
      input: read("[data-login-input]"),
    };
  });

  await tab.playwright.getByRole("radio", { name: "Light", exact: true }).first().click();
  const light = await readTheme();
  await tab.playwright.getByRole("radio", { name: "Dark", exact: true }).first().click();
  const dark = await readTheme();

  assert.equal(light.theme, "light");
  assert.equal(dark.theme, "dark");
  assert.equal(light.canvas.background, "rgb(245, 244, 241)");
  assert.equal(dark.canvas.background, "rgb(4, 5, 6)");
  assert.equal(light.card.background, "rgb(255, 255, 255)");
  assert.equal(dark.card.background, "rgb(7, 17, 31)");
  assert.notEqual(light.heroTitle.color, dark.heroTitle.color);
  assert.notEqual(light.input.background, dark.input.background);
  assert.ok(contrastRatio(dark.heroTitle.color, dark.canvas.background) >= 7);
  assert.ok(contrastRatio(dark.cardTitle.color, dark.card.background) >= 7);
  assert.ok(contrastRatio(dark.input.color, dark.input.background) >= 7);

  return { light, dark };
}
