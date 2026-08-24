import assert from "node:assert/strict";
import test from "node:test";
import {
  deviceResultLabel,
  isDeviceResultArray,
  normalizeDeviceResults,
  summarizeDeviceResult,
} from "./device-results.ts";


test("accepts and summarizes a completed battery result", () => {
  const value = [{
    command: "get_battery_status" as const,
    line: 3,
    status: "completed" as const,
    result: { percent: 82, voltage: 28.4 },
    error: null,
    recorded_at: "2026-08-24T20:00:00.000Z",
  }];

  assert.equal(isDeviceResultArray(value), true);
  assert.equal(deviceResultLabel(value[0].command), "Battery Status");
  assert.match(summarizeDeviceResult(value[0]), /82%/);
});


test("accepts and summarizes a completed body-state result", () => {
  const value = [{
    command: "get_body_state" as const,
    line: 4,
    status: "completed" as const,
    result: { mode: "Stand" },
    error: null,
    recorded_at: "2026-08-24T20:00:01.000Z",
  }];

  assert.equal(isDeviceResultArray(value), true);
  assert.equal(deviceResultLabel(value[0].command), "Body State");
  assert.equal(summarizeDeviceResult(value[0]), "Mode: Stand");
});


test("rejects unapproved or malformed result records", () => {
  assert.equal(isDeviceResultArray([{ command: "forward" }]), false);
  assert.equal(isDeviceResultArray([{ command: "get_body_state", status: "running" }]), false);
  assert.equal(isDeviceResultArray({ command: "get_body_state" }), false);
});


test("normalizes untrusted database values without fabricating results", () => {
  assert.deepEqual(normalizeDeviceResults([{ command: "forward" }]), []);
  assert.deepEqual(normalizeDeviceResults(null), []);
});


test("falls back safely for an unknown structured return shape", () => {
  const record = {
    command: "get_body_state" as const,
    line: null,
    status: "completed" as const,
    result: { vendorSpecific: true },
    error: null,
    recorded_at: "2026-08-24T20:00:01.000Z",
  };

  assert.equal(summarizeDeviceResult(record), "Structured result available");
});
