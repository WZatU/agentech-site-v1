import assert from "node:assert/strict";
import test from "node:test";
import {
  clearExpiredMasterViewSelections,
  createMasterLiveCameraStateStore,
} from "../lib/master-live-camera-state.ts";

function jsonResponse(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("missing persisted Master view state defaults to wall", async () => {
  const calls = [];
  const store = createMasterLiveCameraStateStore({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-role",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse([]);
    },
  });

  assert.deepEqual(await store.get(41), { mode: "wall" });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /master_live_camera_state/);
  assert.equal(calls[0].init.headers.Authorization, "Bearer service-role");
});

test("Master view writes normalize the selection and persist the session expiry", async () => {
  const bodies = [];
  const store = createMasterLiveCameraStateStore({
    supabaseUrl: "https://example.supabase.co/rest/v1",
    serviceRoleKey: "service-role",
    fetchImpl: async (_url, init) => {
      bodies.push(JSON.parse(init.body));
      return jsonResponse(null, 204);
    },
  });
  const expiresAt = "2026-08-09T00:00:00.000Z";

  assert.deepEqual(
    await store.set(42, { mode: "focus", cameraId: "front-left" }, expiresAt),
    { mode: "focus", cameraId: "front-left" },
  );
  assert.deepEqual(
    await store.set(43, { mode: "focus", cameraId: "rear-view" }, expiresAt),
    { mode: "wall" },
  );
  assert.deepEqual(bodies, [
    { session_id: 42, mode: "focus", camera_id: "front-left", expires_at: expiresAt },
    { session_id: 43, mode: "wall", camera_id: null, expires_at: expiresAt },
  ]);
});

test("expired Master view rows are ignored", async () => {
  const store = createMasterLiveCameraStateStore({
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-role",
    fetchImpl: async () => jsonResponse([{
      mode: "focus",
      camera_id: "front-main",
      expires_at: "2026-08-07T00:00:00.000Z",
    }]),
    now: () => new Date("2026-08-08T00:00:00.000Z"),
  });

  assert.deepEqual(await store.get(44), { mode: "wall" });
});

test("expired Master view cleanup deletes only rows at or before the supplied time", async () => {
  const calls = [];
  await clearExpiredMasterViewSelections(new Date("2026-08-08T00:00:00.000Z"), {
    supabaseUrl: "https://example.supabase.co",
    serviceRoleKey: "service-role",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return jsonResponse(null, 204);
    },
  });

  assert.equal(calls[0].init.method, "DELETE");
  assert.match(calls[0].url, /expires_at=lte\.2026-08-08T00%3A00%3A00\.000Z/);
});
