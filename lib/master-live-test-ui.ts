export const masterLiveTestPresentation = (expiresAt = "") => ({
  actionLabel: "Start 30-Minute Master Live Test",
  artifactLabel: "View-only test artifact",
  liveLinkLabel: "Open Master Live Stream",
  livePath: "/agentech-products/eaic-hub/watch-live-run",
  expiresAt,
  viewOnlyNotice: "View-only test. Submitted text will not execute on Master.",
});

export function getCodeCheckingRobotOptions<const Model extends string>(
  normalModels: readonly Model[],
  masterLiveTestAccess: boolean,
) {
  return masterLiveTestAccess ? [...normalModels, "Master" as const] : [...normalModels];
}

export function selectCodeCheckingRobotModel<Model extends string>(
  value: string,
  masterLiveTestAccess: boolean,
  currentNormalRobotModel: Model,
) {
  if (value === "Master") {
    return {
      normalRobotModel: currentNormalRobotModel,
      masterLiveTestSelected: masterLiveTestAccess,
    };
  }

  return {
    normalRobotModel: value as Model,
    masterLiveTestSelected: false,
  };
}

export function buildMasterLiveTestPayload(code: string, uploadedFileName: string) {
  return { code, uploadedFileName };
}
