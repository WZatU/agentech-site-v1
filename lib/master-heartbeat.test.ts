import assert from "node:assert/strict";
import test from "node:test";
import {
  parseMasterHeartbeatObservation,
  toMasterHeartbeatResponse,
  unavailableMasterHeartbeatResponse,
  type MasterHeartbeatObservation,
  toMasterHeartbeatView,
} from "./master-heartbeat.ts";

const now = new Date("2026-09-01T19:00:00.000Z");

const validObservation: MasterHeartbeatObservation = {
  schemaVersion: 1,
  gatewayId: "agentech01",
  observedAt: now.toISOString(),
  master: {
    host: "192.168.4.136",
    controllerResponsive: true,
    connection: "connected",
    posture: "standard",
    action: null,
    state: null,
  },
  battery: {
    available: true,
    percent: 82,
    voltage: 51.6,
    charging: false,
    sourceTopic: "/master/power",
  },
};

test("accepts a complete schema-v1 observation", () => {
  assert.deepEqual(parseMasterHeartbeatObservation(validObservation, now), validObservation);
});

test("rejects unknown fields at every object boundary", () => {
  assert.throws(
    () => parseMasterHeartbeatObservation({ ...validObservation, secret: "leak" }, now),
    /unknown field/i,
  );
  assert.throws(
    () => parseMasterHeartbeatObservation({
      ...validObservation,
      master: { ...validObservation.master, command: "move" },
    }, now),
    /unknown field/i,
  );
  assert.throws(
    () => parseMasterHeartbeatObservation({
      ...validObservation,
      battery: { ...validObservation.battery, raw: 91 },
    }, now),
    /unknown field/i,
  );
});

test("requires the known gateway and Master host", () => {
  assert.throws(
    () => parseMasterHeartbeatObservation({ ...validObservation, gatewayId: "laptop" }, now),
    /gatewayId/i,
  );
  assert.throws(
    () => parseMasterHeartbeatObservation({
      ...validObservation,
      master: { ...validObservation.master, host: "127.0.0.1" },
    }, now),
    /master.host/i,
  );
});

test("rejects battery percentages outside zero through one hundred", () => {
  for (const percent of [-0.01, 100.01]) {
    assert.throws(
      () => parseMasterHeartbeatObservation({
        ...validObservation,
        battery: { ...validObservation.battery, percent },
      }, now),
      /battery.percent/i,
    );
  }
});

test("rejects non-finite and non-positive battery voltage", () => {
  for (const voltage of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
    assert.throws(
      () => parseMasterHeartbeatObservation({
        ...validObservation,
        battery: { ...validObservation.battery, voltage },
      }, now),
      /battery.voltage/i,
    );
  }
});

test("requires null battery values when telemetry is unavailable", () => {
  assert.throws(
    () => parseMasterHeartbeatObservation({
      ...validObservation,
      battery: { available: false, percent: 50, voltage: null, charging: null, sourceTopic: null },
    }, now),
    /unavailable battery/i,
  );
});

test("rejects observations more than thirty seconds from server time", () => {
  for (const observedAt of ["2026-09-01T18:59:29.999Z", "2026-09-01T19:00:30.001Z"] ) {
    assert.throws(
      () => parseMasterHeartbeatObservation({ ...validObservation, observedAt }, now),
      /observedAt/i,
    );
  }
});

test("marks a responsive controller online before fifteen seconds", () => {
  const response = toMasterHeartbeatResponse(
    validObservation,
    now,
    new Date("2026-09-01T19:00:14.999Z"),
  );
  assert.equal(response.fresh, true);
  assert.equal(response.condition, "online");
  assert.equal(response.ageMs, 14_999);
});

test("marks the receipt stale at fifteen seconds", () => {
  const response = toMasterHeartbeatResponse(
    validObservation,
    now,
    new Date("2026-09-01T19:00:15.000Z"),
  );
  assert.equal(response.fresh, false);
  assert.equal(response.condition, "stale");
  assert.equal(response.ageMs, 15_000);
});

test("distinguishes a fresh controller failure", () => {
  const response = toMasterHeartbeatResponse(
    { ...validObservation, master: { ...validObservation.master, controllerResponsive: false } },
    now,
    now,
  );
  assert.equal(response.condition, "controller-offline");
});

test("returns a sanitized unavailable response before the first observation", () => {
  const response = unavailableMasterHeartbeatResponse(now);
  assert.deepEqual(response, {
    schemaVersion: 1,
    gatewayId: "agentech01",
    condition: "unavailable",
    fresh: false,
    ageMs: null,
    observedAt: null,
    receivedAt: null,
    master: null,
    battery: null,
  });
  assert.equal("secret" in response, false);
});

test("builds customer-facing controller and battery labels", () => {
  const response = toMasterHeartbeatResponse(validObservation, now, now);
  assert.deepEqual(toMasterHeartbeatView(response), {
    gateway: "Online",
    controller: "Connected",
    battery: "82% · Not charging",
    mode: "standard",
    lastUpdate: "Just now",
    tone: "online",
  });
});

test("renders unavailable data honestly", () => {
  assert.deepEqual(toMasterHeartbeatView(unavailableMasterHeartbeatResponse(now)), {
    gateway: "Unavailable",
    controller: "Unavailable",
    battery: "Unavailable",
    mode: "Unavailable",
    lastUpdate: "No heartbeat received",
    tone: "unavailable",
  });
});

test("renders stale age without losing last known values", () => {
  const stale = toMasterHeartbeatResponse(validObservation, now, new Date(now.getTime() + 65_000));
  const view = toMasterHeartbeatView(stale);
  assert.equal(view.gateway, "Stale");
  assert.equal(view.lastUpdate, "1m 5s ago");
  assert.equal(view.battery, "82% · Not charging");
});
