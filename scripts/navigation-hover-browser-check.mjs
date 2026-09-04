import assert from "node:assert/strict";

// A Browser skill tab on /about, desktop viewport. The hold intentionally lasts
// longer than a close delay: a slow pointer path inside the navigation must work.
export async function checkNavigationHover(tab, name = "Service") {
  await tab.playwright.getByRole("heading", { name: "Leadership and Technical Members", exact: true }).click();
  const trigger = tab.playwright.getByRole("link", { name, exact: true });
  const center = await tab.playwright.evaluate((menuName) => {
    const element = document.querySelector(`[data-menu-name="${menuName}"][data-mobile="false"] [data-service-menu-trigger]`);
    const rect = element.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }, name);
  await tab.cua.move(center);
  const expanded = () => trigger.getAttribute("aria-expanded");
  assert.equal(await expanded(), "true");

  const header = await tab.playwright.evaluate(() => {
    const rect = document.querySelector("[data-site-header]").getBoundingClientRect();
    return { left: rect.left, right: rect.right, bottom: rect.bottom };
  });
  await tab.cua.move({ x: center.x, y: header.bottom - 3 });
  await tab.cua.move({ x: header.left + 24, y: header.bottom - 3 });
  const deadline = Date.now() + 650;
  while (Date.now() < deadline) {
    assert.equal(await expanded(), "true", `${name} must stay open while moving horizontally across the header`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const geometry = await tab.playwright.evaluate((menuName) => {
    const menu = document.querySelector(`[data-menu-name="${menuName}"][data-mobile="false"]`);
    return {
      trigger: menu.querySelector("[data-service-menu-trigger]").getBoundingClientRect().toJSON(),
      positioner: menu.querySelector("[data-service-menu-positioner]").getBoundingClientRect().toJSON(),
      panel: menu.querySelector("[data-service-menu-panel]").getBoundingClientRect().toJSON()
    };
  }, name);
  const { trigger: triggerRect, positioner, panel } = geometry;
  assert.ok(panel.width <= 320, "the dropdown must remain a compact floating list");
  assert.ok(
    Math.abs((panel.left + panel.right) / 2 - (triggerRect.left + triggerRect.right) / 2) < 2,
    "the dropdown must stay centered below its trigger"
  );
  assert.ok(positioner.top <= header.bottom + 1, "the positioner must begin at the header edge");
  assert.ok(positioner.bottom >= panel.top, "the positioner padding must bridge the pointer path into the dropdown");
  await tab.cua.move({ x: panel.left + 60, y: panel.top + 64 });
  assert.equal(await expanded(), "true", "a diagonal approach into the panel must remain usable");
  await tab.cua.move({ x: panel.right - 24, y: panel.top + 64 });
  assert.equal(await expanded(), "true", "crossing the panel must not dismiss it");

  await tab.cua.move({ x: (panel.left + panel.right) / 2, y: panel.bottom + 80 });
  await tab.playwright.getByRole("heading", { name: name === "Service" ? "AI-DEVELOPMENT" : "EAIS", exact: true }).waitFor({ state: "hidden" });
  assert.equal(await expanded(), "false", "leaving the full navigation region must dismiss the menu");
  return `${name}: slow horizontal movement, diagonal entry, compact flyout alignment, panel traversal and outside dismissal passed.`;
}
