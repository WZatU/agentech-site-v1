export const robotViewingCreditsPerMinute = 100;
export const externalRobotViewingMinimumMinutes = 5;
export const externalRobotViewingMaximumMinutes = 60;

export function getRobotViewingCreditCost(durationMinutes: number) {
  return Math.max(0, Math.floor(durationMinutes)) * robotViewingCreditsPerMinute;
}

export function isValidRobotViewingDuration(durationMinutes: number, internalCompanyAccount: boolean) {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1) {
    return false;
  }

  return internalCompanyAccount
    ? true
    : durationMinutes >= externalRobotViewingMinimumMinutes && durationMinutes <= externalRobotViewingMaximumMinutes;
}
