export const agentechLimits = {
  maxLinearVelocity: 2.37,
  maxYawRate: 2.09,
  maxPitchRate: 0.5,
  recommendedPitchRate: 0.15,
  maxSeconds: 10,
  maxRotateAngle: 360,
  maxLookUpAngle: 20,
  maxLookDownAngle: 25,
  minTurnRate: 0.05,
  minPitchRate: 0.03
} as const;

const allowedPublicActions = new Set([
  "forward",
  "backward",
  "turn_left",
  "turn_right",
  "look_up",
  "look_down",
  "stand",
  "sit",
  "stop",
  "get_battery_status"
]);

type ParsedCall = {
  action: string;
  args: string;
};

function parseCalls(code: string): ParsedCall[] {
  const calls: ParsedCall[] = [];
  const pattern = /(?:Agentech|dog)\.(\w+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    calls.push({ action: match[1], args: match[2] });
  }
  return calls;
}

function numberArg(args: string, name: string): number | null {
  const match = args.match(new RegExp(`${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : null;
}

function requireRange(errors: string[], action: string, name: string, value: number | null, min: number, max: number) {
  if (value === null) {
    return;
  }
  if (!Number.isFinite(value) || value < min || value > max) {
    errors.push(`${action} ${name} must be between ${min} and ${max}.`);
  }
}

export function validateAgentechCode(code: string): string[] {
  const errors: string[] = [];
  for (const call of parseCalls(code)) {
    if (!allowedPublicActions.has(call.action)) {
      errors.push(`${call.action} is not in the current Agentech beginner API. Use forward, backward, turn_left, turn_right, look_up, look_down, stand, sit, stop, or get_battery_status.`);
      continue;
    }

    const speed = numberArg(call.args, "speed");
    const seconds = numberArg(call.args, "seconds");
    const angle = numberArg(call.args, "angle");

    if (call.action === "forward" || call.action === "backward") {
      requireRange(errors, call.action, "speed", speed, 0, agentechLimits.maxLinearVelocity);
      requireRange(errors, call.action, "seconds", seconds, 0, agentechLimits.maxSeconds);
    }

    if (call.action === "yaw") {
      requireRange(errors, call.action, "speed", speed, -agentechLimits.maxYawRate, agentechLimits.maxYawRate);
      requireRange(errors, call.action, "seconds", seconds, 0, agentechLimits.maxSeconds);
    }

    if (["rotate", "left", "right", "turn_left", "turn_right"].includes(call.action)) {
      requireRange(errors, call.action, "angle", angle, -agentechLimits.maxRotateAngle, agentechLimits.maxRotateAngle);
      requireRange(errors, call.action, "speed", speed, agentechLimits.minTurnRate, agentechLimits.maxYawRate);
    }

    if (call.action === "look_up") {
      requireRange(errors, call.action, "angle", angle, 0, agentechLimits.maxLookUpAngle);
      requireRange(errors, call.action, "speed", speed, agentechLimits.minPitchRate, agentechLimits.maxPitchRate);
    }

    if (call.action === "look_down") {
      requireRange(errors, call.action, "angle", angle, 0, agentechLimits.maxLookDownAngle);
      requireRange(errors, call.action, "speed", speed, agentechLimits.minPitchRate, agentechLimits.maxPitchRate);
    }

    if (call.action === "camera_pitch") {
      requireRange(errors, call.action, "angle", angle, -agentechLimits.maxLookDownAngle, agentechLimits.maxLookUpAngle);
      requireRange(errors, call.action, "speed", speed, agentechLimits.minPitchRate, agentechLimits.maxPitchRate);
    }

    if (call.action === "pitch") {
      requireRange(errors, call.action, "speed", speed, -agentechLimits.maxPitchRate, agentechLimits.maxPitchRate);
      requireRange(errors, call.action, "seconds", seconds, 0, agentechLimits.maxSeconds);
    }
  }
  return errors;
}
