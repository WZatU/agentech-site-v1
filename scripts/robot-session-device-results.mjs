const TELEMETRY_COMMANDS = new Set(["get_battery_status", "get_body_state"]);
const RESULT_STATUSES = new Set(["completed", "failed", "not_supported"]);
const DEFAULT_MAX_BYTES = 64 * 1024;
const DEFAULT_MAX_RESULTS = 16;


export function planRequestsDeviceResults(plan) {
  return Array.isArray(plan?.commands)
    && plan.commands.some((command) => TELEMETRY_COMMANDS.has(command?.name));
}


export function deviceResultsStateForPlan(plan, remotePrefix) {
  const requested = planRequestsDeviceResults(plan);
  return {
    deviceResultsRequested: requested,
    deviceResultsPersisted: !requested,
    remoteResults: requested ? `${remotePrefix}.results.json` : null,
  };
}


export function buildDeviceResultsPatch(item, updatedAt = new Date().toISOString()) {
  return {
    device_results: Array.isArray(item.deviceResults) ? item.deviceResults : [],
    device_results_requested: item.deviceResultsRequested === true,
    device_results_error: item.deviceResultsError ?? null,
    device_results_updated_at: updatedAt,
  };
}


export function parseDeviceResults(
  text,
  { maxBytes = DEFAULT_MAX_BYTES, maxResults = DEFAULT_MAX_RESULTS } = {},
) {
  if (typeof text !== "string" || Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new Error("device results payload exceeds the allowed size in bytes");
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("device results payload is not valid JSON");
  }
  if (!Array.isArray(value)) throw new Error("device results payload must be an array");
  if (value.length > maxResults) throw new Error("device results count exceeds the allowed results limit");

  return value.map((record, index) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`device result ${index} must be an object`);
    }
    if (!TELEMETRY_COMMANDS.has(record.command)) {
      throw new Error(`device result ${index} has an unapproved command`);
    }
    if (!RESULT_STATUSES.has(record.status)) {
      throw new Error(`device result ${index} has an invalid status`);
    }
    if (record.line !== null && (!Number.isInteger(record.line) || record.line < 1)) {
      throw new Error(`device result ${index} has an invalid source line`);
    }
    if (
      typeof record.recorded_at !== "string"
      || !Number.isFinite(Date.parse(record.recorded_at))
    ) {
      throw new Error(`device result ${index} has an invalid timestamp`);
    }
    const error = normalizeError(record.error, record.status, index);
    return {
      command: record.command,
      line: record.line,
      status: record.status,
      result: record.result ?? null,
      error,
      recorded_at: record.recorded_at,
    };
  });
}


function normalizeError(value, status, index) {
  if (status === "completed") {
    if (value !== null) throw new Error(`completed device result ${index} cannot include an error`);
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`failed device result ${index} requires an error`);
  }
  if (typeof value.type !== "string" || typeof value.message !== "string") {
    throw new Error(`device result ${index} error must include type and message`);
  }
  const normalized = {
    type: value.type.slice(0, 120),
    message: value.message.slice(0, 2000),
  };
  if (status === "not_supported") {
    for (const key of ["capability", "reason", "device"]) {
      if (typeof value[key] !== "string" || !value[key]) {
        throw new Error(`not-supported device result ${index} requires ${key}`);
      }
      normalized[key] = value[key].slice(0, 1000);
    }
  }
  return normalized;
}
