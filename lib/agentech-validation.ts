export type CheckFinding = { code: string; message: string; line?: number };
export type CheckItem = { name: string; status: "PASS" | "FAIL"; detail: string };
export type SoftwareCheckReport = { status: "PASS" | "FAIL"; commands: string[]; findings: CheckFinding[]; checklist: CheckItem[] };

type Rule = { type: "number" | "integer" | "choice" | "string" | "boolean" | "list"; min?: number; max?: number; open?: boolean; values?: readonly (string | number)[] };
type Spec = { allowed: string[]; required?: string[]; selectors?: string[]; rules: Record<string, Rule> };
const num = (min: number, max: number, open = false): Rule => ({ type: "number", min, max, open });
const integer = (min: number, max: number): Rule => ({ type: "integer", min, max });
const pick = (...values: (string | number)[]): Rule => ({ type: "choice", values });
const level = pick(1, 2, 3, 4, 5);
const positiveNumber = (): Rule => ({ type: "number", min: 0, open: true });
const linearRules = { speed_mps: num(0.05, 3), duration_s: num(0, 10, true), speed_percent: num(0, 100), speed_level: integer(0, 511), pace: pick("slow", "normal", "fast"), step_rate_hz: num(0.5, 3), gait: pick("auto") };

export const agentechSdkSpec: Record<string, Spec> = {
  forward: { allowed: ["speed_mps", "duration_s", "speed_percent", "speed_level", "pace", "step_count", "step_rate_hz", "gait", "distance_m"], selectors: ["speed_mps", "speed_percent", "speed_level", "pace", "step_count", "distance_m"], rules: { ...linearRules, step_count: integer(1, 20), distance_m: num(0, 2) } },
  backward: { allowed: ["speed_mps", "duration_s", "speed_percent", "speed_level", "pace", "step_count", "step_rate_hz", "gait", "distance_m"], selectors: ["speed_mps", "speed_percent", "speed_level", "pace", "step_count", "distance_m"], rules: { ...linearRules, step_count: integer(1, 10), distance_m: num(0, 2) } },
  lateral: { allowed: ["direction", "speed_mps", "duration_s", "speed_percent", "speed_level", "step_count", "step_rate_hz", "gait", "distance_m"], required: ["direction"], selectors: ["speed_mps", "speed_percent", "speed_level", "step_count", "distance_m"], rules: { direction: pick("left", "right"), ...linearRules, step_count: integer(1, 10), distance_m: num(0, 2, true) } },
  turn: { allowed: ["angle_rad", "turn_rate_rad_s", "angle_deg", "turn_rate_deg_s", "rate_percentage", "turn_level", "duration_s"], rules: { angle_rad: { type: "number" }, turn_rate_rad_s: num(-3, 3), angle_deg: { type: "number" }, turn_rate_deg_s: num(-120, 120), rate_percentage: num(-100, 100), turn_level: integer(-511, 511), duration_s: positiveNumber() } },
  turnright: { allowed: [], rules: {} },
  turnleft: { allowed: [], rules: {} },
  uturn: { allowed: [], rules: {} },
  yaw: { allowed: ["direction", "angle_deg", "yaw_rate_rad_s", "angle_percent", "yaw_level", "hold_s"], required: ["direction"], selectors: ["angle_deg", "angle_percent", "yaw_level"], rules: { direction: pick("left", "right"), angle_deg: num(0, 30, true), yaw_rate_rad_s: num(0.05, 0.5), angle_percent: integer(1, 100), yaw_level: level, hold_s: num(0, 3) } },
  backflip: { allowed: ["variant", "stabilize_s"], rules: { variant: pick("standard"), stabilize_s: num(0, 10) } },
  jump: { allowed: ["variant", "stabilize_s"], rules: { variant: pick("standard"), stabilize_s: num(0, 10) } },
  stand: { allowed: ["stabilize_s", "height_level", "posture"], selectors: ["height_level", "posture"], rules: { stabilize_s: num(0, 10), height_level: pick(2), posture: pick("neutral") } },
  sit: { allowed: ["mode", "stabilize_s"], rules: { mode: pick("damping"), stabilize_s: num(0, 10) } },
  stop: { allowed: ["mode", "decel_level", "timeout_s"], rules: { mode: pick("controlled", "quick"), decel_level: level, timeout_s: num(0.1, 5) } },
  emergency_stop: { allowed: ["reason", "latch", "mode"], rules: { reason: { type: "string" }, latch: { type: "boolean" }, mode: pick("damping") } },
  look: { allowed: ["target", "direction", "angle_deg", "pitch_rate_rad_s", "angle_percent", "look_level"], required: ["direction"], selectors: ["angle_deg", "angle_percent", "look_level"], rules: { target: pick("auto", "body"), direction: pick("up", "down"), angle_deg: num(0, 25, true), pitch_rate_rad_s: num(0.03, 0.5), angle_percent: integer(1, 100), look_level: level } },
  get_battery_status: { allowed: ["fields", "max_age_s", "timeout_s"], rules: { fields: { type: "list" }, max_age_s: num(0, 5), timeout_s: num(0.1, 2) } }
};

function valueOf(raw: string): unknown {
  const v = raw.trim();
  if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
  if (/^(?:True|true)$/.test(v)) return true;
  if (/^(?:False|false)$/.test(v)) return false;
  if (/^(["']).*\1$/.test(v)) return v.slice(1, -1);
  if (/^\[.*\]$/.test(v)) return [];
  return undefined; // Variables are allowed; runtime resolves them.
}
function argsOf(raw: string) { return raw.split(/,(?![^\[]*\])/).map((v) => v.trim()).filter(Boolean); }
function checkRule(command: string, name: string, value: unknown, rule: Rule, line: number, add: (code: string, message: string, line?: number) => void) {
  if (value === undefined) return;
  if (rule.type === "number" || rule.type === "integer") {
    if (typeof value !== "number" || (rule.type === "integer" && !Number.isInteger(value))) return add("TYPE_INVALID", `${command}() '${name}' has the wrong type.`, line);
    if ((rule.min !== undefined && (rule.open ? value <= rule.min : value < rule.min)) || (rule.max !== undefined && value > rule.max)) add("RANGE_INVALID", `${command}() '${name}' is outside ${rule.open ? "> " : ""}${rule.min} to ${rule.max}.`, line);
  } else if (rule.type === "choice" && !rule.values?.includes(value as string | number)) add("CHOICE_INVALID", `${command}() '${name}' has unsupported value ${JSON.stringify(value)}.`, line);
  else if (rule.type === "string" && typeof value !== "string") add("TYPE_INVALID", `${command}() '${name}' must be a string.`, line);
  else if (rule.type === "boolean" && typeof value !== "boolean") add("TYPE_INVALID", `${command}() '${name}' must be True or False.`, line);
  else if (rule.type === "list" && !Array.isArray(value)) add("TYPE_INVALID", `${command}() '${name}' must be a list.`, line);
}

export function checkAgentechSoftware(code: string): SoftwareCheckReport {
  const findings: CheckFinding[] = []; const commands: string[] = []; const add = (code: string, message: string, line?: number) => findings.push({ code, message, line });
  const blockedImports = ["os", "sys", "subprocess", "socket", "serial", "mujoco", "unitree", "agibot", "ff_sdk", "mc_sdk_zsl_1_py"];
  const blockedCalls = ["eval", "exec", "open", "compile", "__import__", "input", "globals", "locals", "vars"];
  code.split(/\r?\n/).forEach((text, index) => {
    blockedImports.forEach((name) => { if (new RegExp(`^\\s*(?:from|import)\\s+${name}\\b`).test(text)) add("IMPORT_BLOCKED", `Import '${name}' is blocked.`, index + 1); });
    blockedCalls.forEach((name) => { if (new RegExp(`\\b${name}\\s*\\(`).test(text)) add("UNSAFE_CALL", `${name}() is blocked.`, index + 1); });
    if (/\.__\w+__/.test(text)) add("PRIVATE_ACCESS_BLOCKED", "Private/dunder access is blocked.", index + 1);
    if (/\b(?:ctrl|qpos|qvel|qacc|actuator|motor|torque|joint)\b/i.test(text) && /[=(]/.test(text)) add("DIRECT_CONTROL_BLOCKED", "Direct robot state or actuator control is blocked.", index + 1);
  });
  const pattern = /(?:Agentech|agentech\.Agentech|dog)\.(\w+)\s*\(([^)]*)\)/g; let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    const command = match[1]; const raw = match[2]; const line = code.slice(0, match.index).split(/\r?\n/).length; commands.push(command); const spec = agentechSdkSpec[command];
    if (!spec) { add("UNAPPROVED_SDK_CALL", `${command}() is not in the approved L0.5 SDK.`, line); continue; }
    const values: Record<string, unknown> = {};
    argsOf(raw).forEach((arg) => { const eq = arg.indexOf("="); if (eq < 0) return add("POSITIONAL_PARAMETER_BLOCKED", `${command}() must use named parameters.`, line); const name = arg.slice(0, eq).trim(); if (!spec.allowed.includes(name)) return add("UNKNOWN_PARAMETER", `${command}() does not support '${name}'.`, line); values[name] = valueOf(arg.slice(eq + 1)); });
    (spec.required ?? []).forEach((name) => { if (!(name in values)) add("REQUIRED_PARAMETER", `${command}() requires '${name}'.`, line); });
    let selectors = (spec.selectors ?? []).filter((name) => name in values); if (["forward", "backward", "lateral"].includes(command) && selectors.includes("distance_m") && selectors.includes("speed_mps")) selectors = selectors.filter((name) => name !== "speed_mps");
    if (selectors.length > 1) add("PROFILE_MIXED", `${command}() mixes profiles: ${selectors.join(", ")}.`, line);
    if (command === "turn") {
      const provided = Object.keys(values).sort();
      const profiles = [
        [],
        ["angle_rad"],
        ["angle_rad", "turn_rate_rad_s"],
        ["angle_deg"],
        ["angle_deg", "turn_rate_deg_s"],
        ["duration_s", "rate_percentage"],
        ["duration_s", "turn_level"],
        ["duration_s", "turn_rate_deg_s"],
        ["duration_s", "turn_rate_rad_s"]
      ].map((profile) => [...profile].sort());
      const validProfile = profiles.some((profile) => profile.length === provided.length && profile.every((name, index) => name === provided[index]));
      if (!validProfile) add("PROFILE_MIXED", `turn() parameters do not match one profile: ${provided.join(", ") || "default"}.`, line);

      const signedPairs = [["angle_rad", "turn_rate_rad_s"], ["angle_deg", "turn_rate_deg_s"]] as const;
      signedPairs.forEach(([angleName, rateName]) => {
        const angle = values[angleName];
        const rate = values[rateName];
        if (typeof angle === "number" && typeof rate === "number" && angle * rate < 0) {
          add("SIGN_CONFLICT", `turn() '${angleName}' and '${rateName}' must use the same sign.`, line);
        }
      });
    }
    Object.entries(values).forEach(([name, value]) => checkRule(command, name, value, spec.rules[name], line, add));
  }
  if (!commands.length) add("COMMAND_MISSING", "No approved Agentech SDK command was found.");
  const has = (...codes: string[]) => findings.some((f) => codes.some((c) => f.code.includes(c)));
  const checklist: CheckItem[] = [
    { name: "Software safety", status: has("IMPORT", "UNSAFE", "PRIVATE", "DIRECT") ? "FAIL" : "PASS", detail: "Variables, helper functions, if, for, and while are allowed. Unsafe system and direct robot control are blocked." },
    { name: "SDK commands", status: has("UNAPPROVED", "COMMAND_MISSING") ? "FAIL" : "PASS", detail: `${commands.length} command${commands.length === 1 ? "" : "s"} detected against the L0.5 contract.` },
    { name: "Named parameters", status: has("POSITIONAL", "UNKNOWN", "REQUIRED") ? "FAIL" : "PASS", detail: "Calls use supported named parameters and required fields." },
    { name: "Parameter safety", status: has("TYPE", "RANGE", "CHOICE", "PROFILE", "SIGN") ? "FAIL" : "PASS", detail: "Types, ranges, choices, signs, and profiles match the SDK cards." },
    { name: "Benchmark readiness", status: findings.length ? "FAIL" : "PASS", detail: findings.length ? "Fix findings before simulation and robot review." : "Ready for simulation and real-robot translation checks." }
  ];
  return { status: findings.length ? "FAIL" : "PASS", commands, findings, checklist };
}

export function validateAgentechCode(code: string) { return checkAgentechSoftware(code).findings.map((f) => `${f.line ? `Line ${f.line}: ` : ""}${f.message}`); }
