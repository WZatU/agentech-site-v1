export type DeviceResultCommand = "get_battery_status" | "get_body_state";
export type DeviceResultStatus = "completed" | "failed";

export type DeviceResultError = {
  type: string;
  message: string;
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
  if (value.status !== "completed" && value.status !== "failed") return false;
  if (value.line !== null && (!Number.isInteger(value.line) || Number(value.line) < 1)) return false;
  if (typeof value.recorded_at !== "string" || !Number.isFinite(Date.parse(value.recorded_at))) return false;
  if (value.status === "completed") return value.error === null;
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
