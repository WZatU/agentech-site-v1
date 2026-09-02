import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.LOCAL_AUTH_TEST_BASE_URL ?? "http://localhost:3000";

test("local navigation does not offer a sign-in action", async () => {
  const response = await fetch(`${baseUrl}/agentech-products/eaic-hub`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.doesNotMatch(html, />Sign In</);
});

test("local EAIC Hub renders the workspace without an access gate", async () => {
  const response = await fetch(`${baseUrl}/agentech-products/eaic-hub`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /Embodied AI command infrastructure/i);
  assert.doesNotMatch(html, /Opening EAIC HUB|Checking access/);
});

test("local login requests return to their safe target instead of rendering authentication", async () => {
  const response = await fetch(
    `${baseUrl}/login?next=${encodeURIComponent("/agentech-products/eaic-hub")}`,
    { redirect: "manual" },
  );

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/agentech-products/eaic-hub");
});
