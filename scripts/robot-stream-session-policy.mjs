export function endSessionPostureCommand(robotModel) {
  if (robotModel === "navi") return "lie_down";
  if (robotModel === "aegis") return "sit";
  throw new Error(`unsupported robot model: ${robotModel}`);
}

export function requiresEndLieDown(plan, robotModel) {
  if (!plan || !Array.isArray(plan.commands) || plan.commands.length === 0) {
    throw new Error("compiled plan must contain commands");
  }
  const finalCommand = plan.commands[plan.commands.length - 1];
  return finalCommand?.name !== endSessionPostureCommand(robotModel);
}

export function endSessionCleanupPolicy(plan, robotModel) {
  if (!plan || !Array.isArray(plan.commands) || plan.commands.length === 0) {
    throw new Error("compiled plan must contain commands");
  }
  if (robotModel === "navi") {
    return {
      required: true,
      returnHomeRequired: !plan.commands.some((command) => command?.name === "return_to_home"),
    };
  }
  if (robotModel === "aegis") {
    return { required: requiresEndLieDown(plan, robotModel), returnHomeRequired: false };
  }
  throw new Error(`unsupported robot model: ${robotModel}`);
}

export function keepsStreamActive(item, nowMs) {
  if (["staged", "running"].includes(item.status)) return true;
  return item.status === "completed" && nowMs < Date.parse(item.end);
}

export function finalSessionDatabaseStatus(item) {
  if (item?.status !== "finished") return null;
  const required = item.endCleanupRequired ?? item.endLieDownRequired;
  const cleanupStatus = item.endCleanupStatus ?? item.endLieDownStatus;
  const attempts = Number(item.endCleanupAttempts ?? item.endLieDownAttempts ?? 0);
  if (required !== true) return "completed";
  if (cleanupStatus === "completed") return "completed";
  if (cleanupStatus === "failed" && attempts >= 3) return "failed";
  return null;
}
