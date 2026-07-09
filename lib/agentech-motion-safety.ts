export type AgentechMovementSafetyLevel = "PASS" | "WARNING" | "FAIL";

export type AgentechMovementSafety = {
  level: AgentechMovementSafetyLevel;
  submitReady: boolean;
  maxDistanceMeters: number;
  maxDxMeters: number;
  maxDyMeters: number;
  detail: string;
};

const warningDistanceMeters = 0.8;
const failDistanceMeters = 1.0;
const failAxisMeters = 1.0;

function numberArg(args: string, name: string) {
  const match = args.match(new RegExp(`${name}\\s*=\\s*([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?)`));
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function roundMeters(value: number) {
  return Math.round(value * 1000) / 1000;
}

function formatMeters(value: number) {
  return `${roundMeters(value).toFixed(3)}m`;
}

export function evaluateAgentechMovementSafety(code: string): AgentechMovementSafety {
  const pattern = /(?:Agentech|dog)\.(\w+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  let x = 0;
  let y = 0;
  let maxDistance = 0;
  let maxAbsDx = 0;
  let maxAbsDy = 0;

  function samplePosition(nextX = x, nextY = y) {
    maxDistance = Math.max(maxDistance, Math.hypot(nextX, nextY));
    maxAbsDx = Math.max(maxAbsDx, Math.abs(nextX));
    maxAbsDy = Math.max(maxAbsDy, Math.abs(nextY));
  }

  samplePosition();

  while ((match = pattern.exec(code)) !== null) {
    const command = match[1];
    const args = match[2];
    const speed = numberArg(args, "speed") ?? 0;
    const seconds = numberArg(args, "seconds") ?? 0;

    if (command === "forward") {
      x += speed * seconds;
      samplePosition();
    } else if (command === "backward") {
      x -= speed * seconds;
      samplePosition();
    } else if (command === "lateral_left") {
      y += speed * seconds;
      samplePosition();
    } else if (command === "lateral_right") {
      y -= speed * seconds;
      samplePosition();
    } else if (command === "backflip") {
      x -= 0.44;
      samplePosition();
    } else {
      samplePosition();
    }
  }

  const maxDistanceMeters = roundMeters(maxDistance);
  const maxDxMeters = roundMeters(maxAbsDx);
  const maxDyMeters = roundMeters(maxAbsDy);
  const axisExceeded = maxAbsDx > failAxisMeters || maxAbsDy > failAxisMeters;
  const level: AgentechMovementSafetyLevel = axisExceeded || maxDistance > failDistanceMeters
    ? "FAIL"
    : maxDistance > warningDistanceMeters
      ? "WARNING"
      : "PASS";
  const submitReady = level === "PASS";
  const detail = `Movement safety ${level.toLowerCase()}: max distance ${formatMeters(maxDistanceMeters)}, dx ${formatMeters(maxDxMeters)}, dy ${formatMeters(maxDyMeters)}. Limits: pass <= 0.800m, warning > 0.800m, fail > 1.000m or dx/dy > 1.000m.`;

  return {
    level,
    submitReady,
    maxDistanceMeters,
    maxDxMeters,
    maxDyMeters,
    detail
  };
}
