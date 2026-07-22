import assert from "node:assert/strict";
import test from "node:test";

import { resolveReturnToHomeAccess } from "../lib/return-to-home-access-policy.ts";

const nowMs = Date.parse("2026-07-21T12:00:00Z");

test("internal accounts receive operational access", () => {
  const access = resolveReturnToHomeAccess({ internal: true, nowMs });
  assert.equal(access.allowed, true);
  assert.equal(access.source, "internal");
});

test("a current monthly subscription includes return to home", () => {
  const access = resolveReturnToHomeAccess({
    internal: false,
    subscriptions: [{ status: "active", endsAt: "2026-08-21T12:00:00Z" }],
    nowMs
  });
  assert.equal(access.allowed, true);
  assert.equal(access.source, "subscription");
});

test("an active lifetime entitlement unlocks non-subscribers", () => {
  const access = resolveReturnToHomeAccess({
    internal: false,
    entitlements: [{ status: "active", endsAt: null }],
    nowMs
  });
  assert.equal(access.allowed, true);
  assert.equal(access.source, "purchase");
});

test("expired subscriptions and revoked entitlements are denied", () => {
  const access = resolveReturnToHomeAccess({
    internal: false,
    subscriptions: [{ status: "active", endsAt: "2026-06-21T12:00:00Z" }],
    entitlements: [{ status: "revoked", endsAt: null }],
    nowMs
  });
  assert.deepEqual(access, {
    allowed: false,
    source: "none",
    subscribed: false,
    purchased: false
  });
});
