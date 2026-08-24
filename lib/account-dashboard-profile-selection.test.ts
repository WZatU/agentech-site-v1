import assert from "node:assert/strict";
import test from "node:test";

import { selectSoleProfile } from "./account-dashboard-profile-selection.ts";

test("selects the only profile when the dashboard has no selection", () => {
  assert.equal(selectSoleProfile(null, [{ id: 7 }]), 7);
});

test("preserves no selection when multiple profiles are available", () => {
  assert.equal(selectSoleProfile(null, [{ id: 7 }, { id: 8 }]), null);
});

test("preserves an existing profile selection", () => {
  assert.equal(selectSoleProfile(7, [{ id: 7 }]), 7);
});
