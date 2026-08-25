import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeviceResultsPatch,
  deviceResultsStateForPlan,
  parseDeviceResults,
  planRequestsDeviceResults,
} from "./robot-session-device-results.mjs";


const validResult = {
  command: "get_body_state",
  line: 4,
  status: "completed",
  result: { mode: "Stand" },
  error: null,
  recorded_at: "2026-08-24T20:00:00.000Z",
};


test("detects whether a compiled plan requests device results", () => {
  assert.equal(planRequestsDeviceResults({ commands: [{ name: "forward" }] }), false);
  assert.equal(
    planRequestsDeviceResults({ commands: [{ name: "get_battery_status" }] }),
    true,
  );
  assert.equal(
    planRequestsDeviceResults({ commands: [{ name: "get_body_state" }] }),
    true,
  );
});


test("parses and allowlists a valid device result", () => {
  const parsed = parseDeviceResults(JSON.stringify([validResult]));

  assert.deepEqual(parsed, [validResult]);
  assert.equal(parsed[0].result.mode, "Stand");
});


test("preserves explicit hardware absence as not supported", () => {
  const result = {
    ...validResult,
    command: "get_battery_status",
    status: "not_supported",
    result: null,
    error: {
      type: "CapabilityNotSupportedError",
      message: "battery is not installed",
      capability: "battery",
      reason: "hardware_absent",
      device: "192.168.4.88",
    },
  };

  assert.deepEqual(parseDeviceResults(JSON.stringify([result])), [result]);
});


test("rejects unapproved commands and statuses", () => {
  assert.throws(
    () => parseDeviceResults(JSON.stringify([{ ...validResult, command: "forward" }])),
    /command/,
  );
  assert.throws(
    () => parseDeviceResults(JSON.stringify([{ ...validResult, status: "running" }])),
    /status/,
  );
});


test("rejects invalid timestamps and non-array JSON", () => {
  assert.throws(
    () => parseDeviceResults(JSON.stringify([{ ...validResult, recorded_at: "yesterday" }])),
    /timestamp/,
  );
  assert.throws(() => parseDeviceResults(JSON.stringify(validResult)), /array/);
});


test("enforces payload size and result count limits", () => {
  assert.throws(
    () => parseDeviceResults(JSON.stringify([validResult]), { maxBytes: 10 }),
    /64 KiB|size|bytes/,
  );
  assert.throws(
    () => parseDeviceResults(JSON.stringify([validResult, validResult]), { maxResults: 1 }),
    /16|count|results/,
  );
});


test("returns newly constructed records without unknown fields", () => {
  const parsed = parseDeviceResults(
    JSON.stringify([{ ...validResult, secret: "must not persist" }]),
  );

  assert.equal("secret" in parsed[0], false);
});


test("builds private Gateway state only for telemetry plans", () => {
  assert.deepEqual(
    deviceResultsStateForPlan(
      { commands: [{ name: "get_battery_status" }] },
      "/home/firefly/agentech-stream/session-42",
    ),
    {
      deviceResultsRequested: true,
      deviceResultsPersisted: false,
      remoteResults: "/home/firefly/agentech-stream/session-42.results.json",
    },
  );
  assert.deepEqual(
    deviceResultsStateForPlan(
      { commands: [{ name: "forward" }] },
      "/home/firefly/agentech-stream/session-42",
    ),
    {
      deviceResultsRequested: false,
      deviceResultsPersisted: true,
      remoteResults: null,
    },
  );
});


test("builds the allowlisted Supabase patch for collected results", () => {
  const patch = buildDeviceResultsPatch(
    {
      deviceResultsRequested: true,
      deviceResults: [validResult],
      deviceResultsError: null,
    },
    "2026-08-24T21:00:00.000Z",
  );

  assert.deepEqual(patch, {
    device_results: [validResult],
    device_results_requested: true,
    device_results_error: null,
    device_results_updated_at: "2026-08-24T21:00:00.000Z",
  });
});
