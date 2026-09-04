import assert from "node:assert/strict";
import test from "node:test";

test("moves one product at a time and wraps at both ends", async () => {
  const browser = await import("./robotics-product-browser.ts").catch(() => null);

  assert.ok(browser, "mobile product browser helpers must exist");
  assert.equal(browser.moveProductIndex(0, -1, 4), 3);
  assert.equal(browser.moveProductIndex(3, 1, 4), 0);
  assert.equal(browser.moveProductIndex(1, 1, 4), 2);
  assert.equal(browser.moveProductIndex(2, -1, 4), 1);
});
