export type AgentechMovementSafetyLevel = "PASS" | "WARNING" | "FAIL";

export type AgentechMovementSafety = {
  level: AgentechMovementSafetyLevel;
  submitReady: boolean;
  maxDistanceMeters: number;
  maxDxMeters: number;
  maxDyMeters: number;
  detail: string;
};

const warningAxisMeters = 0.9;
const failAxisMeters = 1.0;

function numberArg(args: string, name: string) {
  const match = args.match(new RegExp(`${name}\\s*=\\s*([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?)`));
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function stringArg(args: string, name: string) {
  const match = args.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`));
  return match?.[1] ?? null;
}

function linearDistance(args: string, defaultSpeed: number, defaultDuration = 1) {
  const directDistance = numberArg(args, "distance_m");
  if (directDistance !== null) return directDistance;

  const stepCount = numberArg(args, "step_count");
  if (stepCount !== null) return stepCount * 0.25;

  const percent = numberArg(args, "speed_percent");
  const level = numberArg(args, "speed_level");
  const pace = stringArg(args, "pace");
  const speed = numberArg(args, "speed_mps")
    ?? (percent !== null ? 3 * percent / 100 : null)
    ?? (level !== null ? 3 * level / 511 : null)
    ?? (pace === "slow" ? 0.2 : pace === "fast" ? 0.8 : pace === "normal" ? 0.4 : null)
    ?? defaultSpeed;
  const duration = numberArg(args, "duration_s") ?? defaultDuration;
  return speed * duration;
}

function turnDegrees(args: string) {
  const angleRad = numberArg(args, "angle_rad");
  if (angleRad !== null) return angleRad * 180 / Math.PI;
  const angleDeg = numberArg(args, "angle_deg");
  if (angleDeg !== null) return angleDeg;
  const duration = numberArg(args, "duration_s") ?? 1;
  const percent = numberArg(args, "rate_percentage");
  if (percent !== null) return duration * (3 * percent / 100) * 180 / Math.PI;
  const level = numberArg(args, "turn_level");
  if (level !== null) return duration * (3 * level / 511) * 180 / Math.PI;
  const rateDeg = numberArg(args, "turn_rate_deg_s");
  if (rateDeg !== null && numberArg(args, "angle_deg") === null) return duration * rateDeg;
  const rateRad = numberArg(args, "turn_rate_rad_s");
  if (rateRad !== null && numberArg(args, "angle_rad") === null) return duration * rateRad * 180 / Math.PI;
  return 45;
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
  let headingRad = 0;
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
    if (command === "forward") {
      const distance = linearDistance(args, 1.0);
      x += Math.cos(headingRad) * distance;
      y += Math.sin(headingRad) * distance;
      samplePosition();
    } else if (command === "backward") {
      const distance = linearDistance(args, 1.0);
      x -= Math.cos(headingRad) * distance;
      y -= Math.sin(headingRad) * distance;
      samplePosition();
    } else if (command === "lateral" || command === "lateral_left" || command === "lateral_right") {
      const distance = linearDistance(args, 0.5, 2.0);
      const side = command === "lateral_right" || stringArg(args, "direction") === "right" ? -1 : 1;
      x += Math.cos(headingRad + side * Math.PI / 2) * distance;
      y += Math.sin(headingRad + side * Math.PI / 2) * distance;
      samplePosition();
    } else if (command === "diagonal") {
      const coordinateX = numberArg(args, "x_m");
      const coordinateY = numberArg(args, "y_m");
      let rightDistance: number;
      let forwardDistance: number;
      if (coordinateX !== null && coordinateY !== null) {
        rightDistance = coordinateX;
        forwardDistance = coordinateY;
      } else {
        const angle = (numberArg(args, "angle_deg") ?? 45) * Math.PI / 180;
        const distance = (numberArg(args, "speed_mps") ?? 0.5) * (numberArg(args, "duration_s") ?? 2.0);
        rightDistance = Math.sin(angle) * distance;
        forwardDistance = Math.cos(angle) * distance;
      }
      x += Math.cos(headingRad) * forwardDistance + Math.cos(headingRad - Math.PI / 2) * rightDistance;
      y += Math.sin(headingRad) * forwardDistance + Math.sin(headingRad - Math.PI / 2) * rightDistance;
      samplePosition();
    } else if (command === "turn") {
      headingRad -= turnDegrees(args) * Math.PI / 180;
    } else if (command === "turn_right") {
      headingRad -= Math.PI / 2;
    } else if (command === "turn_left") {
      headingRad += Math.PI / 2;
    } else if (command === "u_turn") {
      headingRad += Math.PI;
    } else if (command === "backflip") {
      x -= Math.cos(headingRad) * 0.44;
      y -= Math.sin(headingRad) * 0.44;
      samplePosition();
    } else {
      samplePosition();
    }
  }

  const maxDistanceMeters = roundMeters(maxDistance);
  const maxDxMeters = roundMeters(maxAbsDx);
  const maxDyMeters = roundMeters(maxAbsDy);
  const axisExceeded = maxAbsDx > failAxisMeters || maxAbsDy > failAxisMeters;
  const axisWarning = maxAbsDx >= warningAxisMeters || maxAbsDy >= warningAxisMeters;
  const level: AgentechMovementSafetyLevel = axisExceeded
    ? "FAIL"
    : axisWarning
      ? "WARNING"
      : "PASS";
  const submitReady = level !== "FAIL";
  const detail = `Movement safety ${level.toLowerCase()}: max distance ${formatMeters(maxDistanceMeters)}, dx ${formatMeters(maxDxMeters)}, dy ${formatMeters(maxDyMeters)}. Temporary 2m x 2m safety box: warning when |dx| or |dy| reaches 0.900m; fail when |dx| or |dy| exceeds 1.000m.`;

  return {
    level,
    submitReady,
    maxDistanceMeters,
    maxDxMeters,
    maxDyMeters,
    detail
  };
}
