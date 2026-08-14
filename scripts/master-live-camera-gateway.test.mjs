import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isAuthorizedMasterGateway } from "../lib/master-live-camera-gateway-auth.ts";
import {
  buildMasterGatewaySessionQuery,
  selectActiveMasterGatewaySession,
  selectionForMasterGatewayTransport,
} from "../lib/master-live-camera-gateway-session.ts";

test("the H264 transport defaults wall mode to the front camera", () => {
  assert.deepEqual(
    selectionForMasterGatewayTransport({ mode: "wall" }, "h264"),
    { mode: "focus", cameraId: "front-main" },
  );
  assert.deepEqual(
    selectionForMasterGatewayTransport({ mode: "focus", cameraId: "front-right" }, "h264"),
    { mode: "focus", cameraId: "front-right" },
  );
  assert.deepEqual(
    selectionForMasterGatewayTransport({ mode: "wall" }, null),
    { mode: "wall" },
  );
});

test("gateway bearer authorization accepts only the exact configured secret", () => {
  assert.equal(isAuthorizedMasterGateway("Bearer production-secret", "production-secret"), true);
  assert.equal(isAuthorizedMasterGateway("Bearer wrong-secret", "production-secret"), false);
  assert.equal(isAuthorizedMasterGateway("production-secret", "production-secret"), false);
  assert.equal(isAuthorizedMasterGateway(null, "production-secret"), false);
  assert.equal(isAuthorizedMasterGateway("Bearer production-secret", ""), false);
});

test("gateway authorization accepts a configured high-entropy token fingerprint", () => {
  assert.equal(
    isAuthorizedMasterGateway(
      "Bearer agentech-machine-token",
      "different-primary-secret",
      ["bddb56f685aaf70fe7fafb4fd1e7757dfb198e87bdb4214e17ef9ee36225de2a"],
    ),
    true,
  );
  assert.equal(
    isAuthorizedMasterGateway(
      "Bearer wrong-machine-token",
      "different-primary-secret",
      ["bddb56f685aaf70fe7fafb4fd1e7757dfb198e87bdb4214e17ef9ee36225de2a"],
    ),
    false,
  );
});

test("private gateway route is no-store and returns only active Master state", () => {
  const route = readFileSync("app/api/master-live-camera/gateway/route.ts", "utf8");
  assert.match(route, /MASTER_CAMERA_GATEWAY_SECRET/);
  assert.match(route, /isAuthorizedMasterGateway/);
  assert.match(route, /robotModel !== "Master"/);
  assert.match(route, /active: false/);
  assert.match(route, /Cache-Control.*no-store/s);
  assert.match(route, /createMasterPublisherToken/);
  assert.match(route, /livekitUrl/);
  assert.match(route, /publisherToken/);
  assert.match(route, /transport/);
  assert.match(route, /selectionForMasterGatewayTransport/);
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

test("gateway filters for Master before limiting active session rows", () => {
  const now = new Date("2026-08-14T21:29:00.000Z");

  assert.equal(
    buildMasterGatewaySessionQuery(now),
    "scheduled_start=lte.2026-08-14T21%3A29%3A00.000Z"
      + "&scheduled_end=gte.2026-08-14T21%3A29%3A00.000Z"
      + "&robot_model=eq.Master"
      + "&select=id,robot_model,session_status,scheduled_start,scheduled_end"
      + "&order=scheduled_start.asc"
      + "&limit=10",
  );
});
