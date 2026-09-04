import assert from "node:assert/strict";

async function readHeroState(tab) {
  return tab.playwright.evaluate(() => {
    const root = document.querySelector("[data-navi-theme-page]");
    const hero = root?.firstElementChild;
    const image = hero?.querySelector(".navi-hero-image");
    const overlay = image?.nextElementSibling;
    const title = hero?.querySelector(".navi-hero-title");
    const body = title?.nextElementSibling;

    return {
      theme: document.documentElement.dataset.theme,
      heroBackground: hero ? getComputedStyle(hero).backgroundColor : null,
      overlayBackground: overlay ? getComputedStyle(overlay).backgroundImage : null,
      titleColor: title ? getComputedStyle(title).color : null,
      bodyColor: body ? getComputedStyle(body).color : null
    };
  });
}

export async function checkNaviHeroThemes(tab) {
  await tab.playwright.getByRole("radio", { name: "Light", exact: true }).check();
  const light = await readHeroState(tab);

  await tab.playwright.getByRole("radio", { name: "Dark", exact: true }).check();
  const dark = await readHeroState(tab);

  assert.equal(light.theme, "light");
  assert.equal(light.heroBackground, "rgb(245, 244, 241)");
  assert.equal(light.titleColor, "rgb(17, 17, 17)");
  assert.match(light.bodyColor ?? "", /^rgb\(/);

  assert.equal(dark.theme, "dark");
  assert.equal(dark.heroBackground, "rgb(7, 17, 31)");
  assert.equal(dark.titleColor, "rgb(255, 255, 255)");
  assert.notEqual(light.overlayBackground, dark.overlayBackground);

  return { light, dark };
}
