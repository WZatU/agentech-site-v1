export type DeviceResultCommand = "get_battery_status" | "get_body_state";
export type DeviceResultStatus = "completed" | "failed" | "not_supported";

export type DeviceResultError = {
  type: string;
  message: string;
  capability?: string;
  reason?: string;
  device?: string;
};

export type DeviceResult = {
  command: DeviceResultCommand;
  line: number | null;
  status: DeviceResultStatus;
  result: unknown | null;
  error: DeviceResultError | null;
  recorded_at: string;
};


const commands = new Set<DeviceResultCommand>([
  "get_battery_status",
  "get_body_state",
]);


export function isDeviceResultArray(value: unknown): value is DeviceResult[] {
  return Array.isArray(value) && value.every(isDeviceResult);
}


export function normalizeDeviceResults(value: unknown): DeviceResult[] {
  return isDeviceResultArray(value) ? value : [];
}


function isDeviceResult(value: unknown): value is DeviceResult {
  if (!isRecord(value)) return false;
  if (!commands.has(value.command as DeviceResultCommand)) return false;
  if (!["completed", "failed", "not_supported"].includes(String(value.status))) return false;
  if (value.line !== null && (!Number.isInteger(value.line) || Number(value.line) < 1)) return false;
  if (typeof value.recorded_at !== "string" || !Number.isFinite(Date.parse(value.recorded_at))) return false;
  if (value.status === "completed") return value.error === null;
  if (value.status === "not_supported") {
    return value.result === null
      && isError(value.error)
      && typeof value.error.capability === "string"
      && typeof value.error.reason === "string"
      && typeof value.error.device === "string";
  }
  return isError(value.error);
}


function isError(value: unknown): value is DeviceResultError {
  return isRecord(value)
    && typeof value.type === "string"
    && typeof value.message === "string";
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}


export function deviceResultLabel(command: DeviceResultCommand): string {
  return command === "get_battery_status" ? "Battery Status" : "Body State";
}


export function summarizeDeviceResult(record: DeviceResult): string {
  if (record.status === "not_supported") {
    return `Not supported: ${record.error?.reason || record.error?.message || "capability unavailable"}`;
  }
  if (record.status === "failed") return record.error?.message || "Device call failed";
  if (!isRecord(record.result)) return record.result == null ? "No result payload" : String(record.result);

  if (record.command === "get_battery_status") {
    const details = [
      numericDetail(record.result.percent, "%", "Battery"),
      numericDetail(record.result.voltage, " V", "Voltage"),
      numericDetail(record.result.current, " A", "Current"),
      numericDetail(record.result.temperature, " °C", "Temperature"),
    ].filter((value): value is string => Boolean(value));
    if (details.length > 0) return details.join(" · ");
  } else {
    for (const [key, label] of [["mode", "Mode"], ["state", "State"], ["status", "Status"]] as const) {
      const value = record.result[key];
      if (typeof value === "string" || typeof value === "number") return `${label}: ${value}`;
    }
  }
  return "Structured result available";
}


function numericDetail(value: unknown, suffix: string, label: string): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? `${label}: ${value}${suffix}`
    : null;
}


export type DeviceResultsViewModel = {
  visible: boolean;
  items: Array<{
    label: string;
    summary: string;
    tone: "success" | "warning" | "error";
    status: DeviceResultStatus;
    recordedAt: string;
    sourceLine: number | null;
    rawJson: string;
    errorText: string | null;
  }>;
  collectionError: string | null;
};


export function buildDeviceResultsViewModel(input: {
  requested: boolean;
  results: DeviceResult[];
  collectionError: string | null;
}): DeviceResultsViewModel {
  const collectionError = input.collectionError || null;
  const items = input.results.map((record) => ({
    label: deviceResultLabel(record.command),
    summary: summarizeDeviceResult(record),
    tone: record.status === "completed"
      ? "success" as const
      : record.status === "not_supported"
        ? "warning" as const
        : "error" as const,
    status: record.status,
    recordedAt: record.recorded_at,
    sourceLine: record.line,
    rawJson: JSON.stringify(record, null, 2),
    errorText: record.error ? `${record.error.type}: ${record.error.message}` : null,
  }));
  return {
    visible: input.requested || items.length > 0 || collectionError !== null,
    items,
    collectionError,
  };
}
