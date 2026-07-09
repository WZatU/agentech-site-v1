export const agentechLimits = {
  maxLinearVelocity: 2.37,
  maxBackwardVelocity: 2.365,
  maxLateralVelocity: 0.78,
  maxLinearAcceleration: 2.5,
  maxYawRate: 2.09,
  slowYawRate: 1.05,
  maxPitchRate: 0.5,
  recommendedPitchRate: 0.15,
  maxSeconds: 10,
  maxRotateAngle: 360,
  maxLookUpAngle: 25,
  maxLookDownAngle: 25,
  maxRollAngle: 28,
  minTurnRate: 0.05,
  minPitchRate: 0.03
} as const;

type MotionParameterRule = {
  required: Set<string>;
  allowed: Set<string>;
  ranges: Record<string, { low: number; high: number; allowZero: boolean }>;
  example: string;
};

const physicalActionNames = [
  "forward",
  "backward",
  "lateral_left",
  "lateral_right",
  "turn_left",
  "turn_right",
  "twist_left",
  "twist_right",
  "backflip",
  "jump",
  "stand",
  "sit",
  "stop"
] as const;
const allowedPhysicalActions = new Set<string>(physicalActionNames);
const physicalActionHelp = physicalActionNames.join(", ");
const motionParameterRules: Record<string, MotionParameterRule> = {
  stand: {
    required: new Set(),
    allowed: new Set(["stand_wait"]),
    ranges: { stand_wait: { low: 0, high: 10, allowZero: true } },
    example: "Agentech.stand(stand_wait=1)"
  },
  forward: {
    required: new Set(["speed", "seconds"]),
    allowed: new Set(["speed", "seconds", "stand_wait"]),
    ranges: {
      speed: { low: 0, high: agentechLimits.maxLinearVelocity, allowZero: false },
      seconds: { low: 0, high: agentechLimits.maxSeconds, allowZero: false },
      stand_wait: { low: 0, high: agentechLimits.maxSeconds, allowZero: true }
    },
    example: "Agentech.forward(speed=0.3, seconds=3)"
  },
  backward: {
    required: new Set(["speed", "seconds"]),
    allowed: new Set(["speed", "seconds", "stand_wait"]),
    ranges: {
      speed: { low: 0, high: agentechLimits.maxBackwardVelocity, allowZero: false },
      seconds: { low: 0, high: agentechLimits.maxSeconds, allowZero: false },
      stand_wait: { low: 0, high: agentechLimits.maxSeconds, allowZero: true }
    },
    example: "Agentech.backward(speed=0.3, seconds=3)"
  },
  lateral_left: {
    required: new Set(["speed", "seconds"]),
    allowed: new Set(["speed", "seconds", "stand_wait"]),
    ranges: {
      speed: { low: 0, high: agentechLimits.maxLateralVelocity, allowZero: false },
      seconds: { low: 0, high: agentechLimits.maxSeconds, allowZero: false },
      stand_wait: { low: 0, high: agentechLimits.maxSeconds, allowZero: true }
    },
    example: "Agentech.lateral_left(speed=0.2, seconds=1)"
  },
  lateral_right: {
    required: new Set(["speed", "seconds"]),
    allowed: new Set(["speed", "seconds", "stand_wait"]),
    ranges: {
      speed: { low: 0, high: agentechLimits.maxLateralVelocity, allowZero: false },
      seconds: { low: 0, high: agentechLimits.maxSeconds, allowZero: false },
      stand_wait: { low: 0, high: agentechLimits.maxSeconds, allowZero: true }
    },
    example: "Agentech.lateral_right(speed=0.2, seconds=1)"
  },
  turn_left: {
    required: new Set(["angle"]),
    allowed: new Set(["angle", "speed"]),
    ranges: {
      angle: { low: 0, high: agentechLimits.maxRotateAngle, allowZero: false },
      speed: { low: agentechLimits.minTurnRate, high: agentechLimits.maxYawRate, allowZero: true }
    },
    example: "Agentech.turn_left(angle=45, speed=0.35)"
  },
  turn_right: {
    required: new Set(["angle"]),
    allowed: new Set(["angle", "speed"]),
    ranges: {
      angle: { low: 0, high: agentechLimits.maxRotateAngle, allowZero: false },
      speed: { low: agentechLimits.minTurnRate, high: agentechLimits.maxYawRate, allowZero: true }
    },
    example: "Agentech.turn_right(angle=45, speed=0.35)"
  },
  twist_left: {
    required: new Set(["angle"]),
    allowed: new Set(["angle", "speed"]),
    ranges: {
      angle: { low: 0, high: agentechLimits.maxRollAngle, allowZero: false },
      speed: { low: agentechLimits.minTurnRate, high: agentechLimits.maxYawRate, allowZero: true }
    },
    example: "Agentech.twist_left(angle=28, speed=0.35)"
  },
  twist_right: {
    required: new Set(["angle"]),
    allowed: new Set(["angle", "speed"]),
    ranges: {
      angle: { low: 0, high: agentechLimits.maxRollAngle, allowZero: false },
      speed: { low: agentechLimits.minTurnRate, high: agentechLimits.maxYawRate, allowZero: true }
    },
    example: "Agentech.twist_right(angle=28, speed=0.35)"
  },
  backflip: {
    required: new Set(),
    allowed: new Set(),
    ranges: {},
    example: "Agentech.backflip()"
  },
  jump: {
    required: new Set(),
    allowed: new Set(),
    ranges: {},
    example: "Agentech.jump()"
  },
  sit: {
    required: new Set(),
    allowed: new Set(),
    ranges: {},
    example: "Agentech.sit()"
  },
  stop: {
    required: new Set(),
    allowed: new Set(),
    ranges: {},
    example: "Agentech.stop()"
  }
};

type ParsedCall = {
  action: string;
  args: string;
  line: number;
};

function parseCalls(code: string): ParsedCall[] {
  const calls: ParsedCall[] = [];
  const pattern = /(?:Agentech|dog)\.(\w+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    calls.push({
      action: match[1],
      args: match[2],
      line: code.slice(0, match.index).split(/\r\n|\r|\n/).length
    });
  }
  return calls;
}

function splitArguments(args: string) {
  const parts: string[] = [];
  let current = "";
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;

  for (const char of args) {
    if (quote) {
      current += char;
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      current += char;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function findTopLevelEquals(value: string) {
  let quote: string | null = null;
  let escaped = false;
  let depth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      quote = char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (char === "=" && depth === 0) {
      return index;
    }
  }

  return -1;
}

function literalNumber(value: string) {
  const trimmed = value.trim();
  if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(trimmed)) {
    return null;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function validateImportsAndUnsafeCode(code: string, errors: string[]) {
  const lines = code.split(/\r\n|\r|\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const importMatch = trimmed.match(/^import\s+(.+)$/);
    if (importMatch) {
      for (const item of importMatch[1].split(",")) {
        const moduleName = item.trim().split(/\s+as\s+/)[0];
        if (moduleName !== "agentech") {
          errors.push(`Line ${lineNumber}: blocked import '${moduleName}'. Customer code can only use the Agentech SDK.`);
        }
      }
    }

    const importFromMatch = trimmed.match(/^from\s+([.\w]+)\s+import\s+/);
    if (importFromMatch && importFromMatch[1] !== "agentech") {
      errors.push(`Line ${lineNumber}: blocked import from '${importFromMatch[1]}'. Customer code can only import from the Agentech SDK.`);
    }

    if (/^(for|while|with|try|class)\b/.test(trimmed) || /\blambda\b/.test(trimmed)) {
      errors.push(`Line ${lineNumber}: blocked Python structure. This hardware check only accepts direct Agentech motion commands.`);
    }
  });

  const blockedCallPattern = /\b(eval|exec|open|compile|__import__|input|globals|locals|vars)\s*\(/g;
  let blockedCallMatch: RegExpExecArray | null;
  while ((blockedCallMatch = blockedCallPattern.exec(code)) !== null) {
    const line = code.slice(0, blockedCallMatch.index).split(/\r\n|\r|\n/).length;
    errors.push(`Line ${line}: blocked function call '${blockedCallMatch[1]}()'. Use the Agentech SDK only.`);
  }
}

function validateMotionCallParameters(errors: string[], call: ParsedCall) {
  const rule = motionParameterRules[call.action];
  if (!rule) {
    errors.push(
      `Line ${call.line}: Agentech.${call.action}() is not supported by the Step 3 Physical Hardware Check. Supported commands: ${physicalActionHelp}.`
    );
    return;
  }

  const kwargs = new Map<string, string>();
  const args = splitArguments(call.args);
  let reportedPositionalParameter = false;

  for (const arg of args) {
    if (arg.startsWith("**")) {
      errors.push(`Line ${call.line}: Agentech.${call.action}() cannot use expanded keyword arguments. Example: ${rule.example}`);
      continue;
    }

    const equalsIndex = findTopLevelEquals(arg);
    if (equalsIndex < 0) {
      if (!reportedPositionalParameter) {
        errors.push(`Line ${call.line}: Agentech.${call.action}() must use named keyword parameters. Example: ${rule.example}`);
        reportedPositionalParameter = true;
      }
      continue;
    }

    const name = arg.slice(0, equalsIndex).trim();
    const value = arg.slice(equalsIndex + 1).trim();

    if (!/^[A-Za-z_]\w*$/.test(name)) {
      errors.push(`Line ${call.line}: Agentech.${call.action}() has an invalid parameter name. Example: ${rule.example}`);
      continue;
    }

    if (!rule.allowed.has(name)) {
      const allowed = rule.allowed.size ? [...rule.allowed].sort().join(", ") : "no parameters";
      errors.push(`Line ${call.line}: Agentech.${call.action}() does not support parameter '${name}'. Allowed parameters: ${allowed}. Example: ${rule.example}`);
      continue;
    }

    if (!value) {
      errors.push(`Line ${call.line}: Agentech.${call.action}() parameter '${name}' must be a literal value. Example: ${rule.example}`);
      continue;
    }

    if (kwargs.has(name)) {
      errors.push(`Line ${call.line}: Agentech.${call.action}() repeats parameter '${name}'. Example: ${rule.example}`);
      continue;
    }

    kwargs.set(name, value);
  }

  const missing = [...rule.required].filter((name) => !kwargs.has(name)).sort();
  if (missing.length) {
    errors.push(`Line ${call.line}: Agentech.${call.action}() is missing required parameter(s): ${missing.join(", ")}. Example: ${rule.example}`);
  }

  for (const [name, rawValue] of kwargs) {
    const range = rule.ranges[name];
    if (!range) {
      continue;
    }

    const numeric = literalNumber(rawValue);
    if (numeric === null) {
      errors.push(`Line ${call.line}: Agentech.${call.action}() parameter '${name}' must be a finite number. Example: ${rule.example}`);
      continue;
    }

    const lowerOk = range.allowZero ? numeric >= range.low : numeric > range.low;
    if (!lowerOk || numeric > range.high) {
      const lowerText = range.allowZero ? `>= ${range.low}` : `> ${range.low}`;
      errors.push(
        `Line ${call.line}: Agentech.${call.action}() parameter '${name}' is out of range: ${numeric}. Required range: ${lowerText} and <= ${range.high}. Example: ${rule.example}`
      );
    }
  }
}

export function validateAgentechCode(code: string): string[] {
  const errors: string[] = [];
  validateImportsAndUnsafeCode(code, errors);

  for (const call of parseCalls(code)) {
    if (!allowedPhysicalActions.has(call.action)) {
      errors.push(
        `Line ${call.line}: Agentech.${call.action}() is not supported by the Step 3 Physical Hardware Check. Supported commands: ${physicalActionHelp}.`
      );
      continue;
    }
    validateMotionCallParameters(errors, call);
  }

  return errors;
}
