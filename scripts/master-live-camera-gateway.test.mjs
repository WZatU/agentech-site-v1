import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isAuthorizedMasterGateway } from "../lib/master-live-camera-gateway-auth.ts";
import { selectActiveMasterGatewaySession } from "../lib/master-live-camera-gateway-session.ts";

test("gateway bearer authorization accepts only the exact configured secret", () => {
  assert.equal(isAuthorizedMasterGateway("Bearer production-secret", "production-secret"), true);
  assert.equal(isAuthorizedMasterGateway("Bearer wrong-secret", "production-secret"), false);
  assert.equal(isAuthorizedMasterGateway("production-secret", "production-secret"), false);
  assert.equal(isAuthorizedMasterGateway(null, "production-secret"), false);
  assert.equal(isAuthorizedMasterGateway("Bearer production-secret", ""), false);
});

test("private gateway route is no-store and returns only active Master state", () => {
  const route = readFileSync("app/api/master-live-camera/gateway/route.ts", "utf8");
  assert.match(route, /MASTER_CAMERA_GATEWAY_SECRET/);
  assert.match(route, /isAuthorizedMasterGateway/);
  assert.match(route, /robotModel !== "Master"/);
  assert.match(route, /active: false/);
  assert.match(route, /Cache-Control.*no-store/s);
  assert.doesNotMatch(route, /Aegies.*active: true|Navi.*active: true/s);
});

test("gateway session selection excludes Aegies, Navi, and expired Master sessions", () => {
  const now = new Date("2026-08-08T01:00:00.000Z");
  const rows = [
    { id: 1, robot_model: "Aegies", session_status: "running", scheduled_start: "2026-08-08T00:00:00Z", scheduled_end: "2026-08-08T02:00:00Z" },
    { id: 2, robot_model: "Navi", session_status: "running", scheduled_start: "2026-08-08T00:00:00Z", scheduled_end: "2026-08-08T02:00:00Z" },
    { id: 3, robot_model: "Master", session_status: "completed", scheduled_start: "2026-08-08T00:00:00Z", scheduled_end: "2026-08-08T02:00:00Z" },
    { id: 4, robot_model: "Master", session_status: "running", scheduled_start: "2026-08-07T22:00:00Z", scheduled_end: "2026-08-07T23:00:00Z" },
    { id: 5, robot_model: "Master", session_status: "running", scheduled_start: "2026-08-08T00:00:00Z", scheduled_end: "2026-08-08T02:00:00Z" },
  ];

  assert.deepEqual(selectActiveMasterGatewaySession(rows, now), {
    id: 5,
    robotModel: "Master",
    status: "running",
    scheduledStart: "2026-08-08T00:00:00Z",
    scheduledEnd: "2026-08-08T02:00:00Z",
  });
});
