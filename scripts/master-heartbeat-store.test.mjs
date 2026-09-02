import assert from "node:assert/strict";
import test from "node:test";

const saved = { ...process.env };
process.env.SUPABASE_URL = "https://example.supabase.co/rest/v1";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";

const { readLatestHeartbeat, writeLatestHeartbeat } = await import("../lib/master-heartbeat-store.ts");

test.after(() => {
  process.env = saved;
});

const record = {
  observation: {
    schemaVersion: 1,
    gatewayId: "agentech01",
    observedAt: "2026-09-01T12:00:00.000Z",
    master: { host: "192.168.4.136", controllerResponsive: true, connection: "connected", posture: "standard", action: null, state: null },
    battery: { available: true, percent: 89, voltage: 52.67, charging: false, sourceTopic: "/aima/hal/pmu/state" },
  },
  receivedAt: "2026-09-01T12:00:01.000Z",
};

test("production store upserts the latest heartbeat to private Supabase Storage", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://example.supabase.co/storage/v1/object/robot-captures/master-heartbeat/latest.json");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.apikey, "service-role-test-key");
    assert.equal(init.headers["x-upsert"], "true");
    assert.deepEqual(JSON.parse(init.body), record);
    return new Response("{}", { status: 200 });
  };
  try { await writeLatestHeartbeat(record); } finally { globalThis.fetch = originalFetch; }
});

test("production store reads and validates the private Supabase object", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://example.supabase.co/storage/v1/object/authenticated/robot-captures/master-heartbeat/latest.json");
    assert.equal(init.headers.Authorization, "Bearer service-role-test-key");
    return new Response(JSON.stringify(record), { status: 200 });
  };
  try { assert.deepEqual(await readLatestHeartbeat(), record); } finally { globalThis.fetch = originalFetch; }
});

test("production store treats a missing object as no heartbeat", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("missing", { status: 404 });
  try { assert.equal(await readLatestHeartbeat(), null); } finally { globalThis.fetch = originalFetch; }
});
