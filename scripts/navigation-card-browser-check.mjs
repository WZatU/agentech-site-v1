import assert from "node:assert/strict";

// Run through a Browser skill tab with the site header visible. On mobile,
// open the navigation drawer first. Click the column's empty bottom-right area.
export async function checkNavigationCard(tab, name = "Platform", mobile = false) {
  const trigger = tab.playwright.getByRole(mobile ? "button" : "link", { name, exact: true });
  await trigger.press("ArrowDown");
  const label = name === "Platform" ? "EAIC" : "ROBOTICS";
  const expectedPath = name === "Platform" ? "/agentech-products/eaic-hub" : "/agentech-robotic";
  await tab.playwright.getByRole("link", { name: label, exact: true }).waitFor({ state: "visible" });
  const target = await tab.playwright.evaluate(({ menuName, isMobile }) => {
    const column = document.querySelector(`[data-menu-name="${menuName}"][data-mobile="${isMobile}"] [data-service-menu-column]`);
    const rect = column.getBoundingClientRect();
    const x = rect.right - 12;
    const y = rect.bottom - 12;
    return {
      x, y,
      origin: window.location.origin,
      hrefAtBlankPoint: document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href"),
      nestedControls: column.querySelectorAll("button, a a, [aria-haspopup]").length
    };
  }, { menuName: name, isMobile: mobile });
  assert.equal(target.hrefAtBlankPoint, expectedPath, "the empty corner of the category must be part of its link");
  assert.equal(target.nestedControls, 0, "a category is one direct link, with no nested menu");
  await tab.cua.click({ x: target.x, y: target.y });
  await tab.playwright.waitForURL(`${target.origin}${expectedPath}`);
  await tab.playwright.getByRole("heading", { name: label, exact: true }).waitFor({ state: "hidden" });
  if (mobile) {
    await tab.playwright.getByRole("button", { name: "Open navigation", exact: true }).waitFor({ state: "visible" });
  }
  return `${name} ${mobile ? "mobile" : "desktop"}: clicking blank card space navigates directly and closes navigation.`;
}
