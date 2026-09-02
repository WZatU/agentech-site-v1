import assert from "node:assert/strict";
import test from "node:test";

test("public review login always returns to the public homepage", async () => {
  const policy = await import("./local-auth-bypass.ts").catch(() => null);

  assert.equal(
    policy?.resolveLoginBypassDestination(
      { get: () => "temporary-review.vercel.app" },
      "/account-setup",
      true,
    ),
    "/",
  );
});

test("local login keeps its safe requested destination", async () => {
  const policy = await import("./local-auth-bypass.ts").catch(() => null);

  assert.equal(
    policy?.resolveLoginBypassDestination(
      { get: () => "localhost:3000" },
      "/agentech-products/eaic-hub",
      false,
    ),
    "/agentech-products/eaic-hub",
  );
});

test("normal public login is not bypassed", async () => {
  const policy = await import("./local-auth-bypass.ts").catch(() => null);

  assert.equal(
    policy?.resolveLoginBypassDestination(
      { get: () => "agentech.com" },
      "/account-setup",
      false,
    ),
    null,
  );
});
