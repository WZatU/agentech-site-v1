import { normalizeAgentechRobotModel, type AgentechRobotModel } from "../features/eaic/02-unified-api/resources-runs/agentech-robot-model.ts";

export const MASTER_LIVE_CAMERAS = [
  { id: "front-main", label: "Front Main", wallResolution: "480x360 low latency", wallTopic: "/agentech/web/front_main/compressed", focusResolution: "960x720 high resolution", focusFrameRate: "up to 30 FPS", focusTopic: "/agentech/web/focus/front_main/compressed" },
  { id: "front-left", label: "Front Left", wallResolution: "480x360 low latency", wallTopic: "/agentech/web/front_left/compressed", focusResolution: "960x720 high resolution", focusFrameRate: "up to 30 FPS", focusTopic: "/agentech/web/focus/front_left/compressed" },
  { id: "front-right", label: "Front Right", wallResolution: "480x360 low latency", wallTopic: "/agentech/web/front_right/compressed", focusResolution: "960x720 high resolution", focusFrameRate: "up to 30 FPS", focusTopic: "/agentech/web/focus/front_right/compressed" },
  { id: "rgbd-color", label: "RGB-D Color", wallResolution: "480x360 low latency", wallTopic: "/agentech/web/rgbd_color/compressed", focusResolution: "640x480 native", focusFrameRate: "up to 30 FPS", focusTopic: "/agentech/web/focus/rgbd_color/compressed" },
] as const;

export type MasterCameraId = (typeof MASTER_LIVE_CAMERAS)[number]["id"];
export type MasterViewSelection = { mode: "wall" } | { mode: "focus"; cameraId: MasterCameraId };
export type LiveRobotModel = AgentechRobotModel | "Master";

export type MasterCameraStream = {
  topic: string;
  resolution: string;
  quality: "wall" | "focus" | "fallback";
};

export function resolveMasterCameraStream(
  cameraId: MasterCameraId,
  mode: "wall" | "focus",
  advertisedTopics: readonly string[],
): MasterCameraStream | null {
  const camera = MASTER_LIVE_CAMERAS.find(({ id }) => id === cameraId);
  if (!camera) return null;

  const advertised = new Set(advertisedTopics);

  if (mode === "focus" && advertised.has(camera.focusTopic)) {
    return { topic: camera.focusTopic, resolution: camera.focusResolution, quality: "focus" };
  }

  if (advertised.has(camera.wallTopic)) {
    return {
      topic: camera.wallTopic,
      resolution: camera.wallResolution,
      quality: mode === "focus" ? "fallback" : "wall",
    };
  }

  return null;
}

export function normalizeMasterCameraId(value: unknown): MasterCameraId | null {
  if (typeof value !== "string") return null;
  return MASTER_LIVE_CAMERAS.some(({ id }) => id === value) ? value as MasterCameraId : null;
}

export function normalizeMasterViewSelection(value: unknown): MasterViewSelection {
  if (!value || typeof value !== "object") return { mode: "wall" };
  const candidate = value as { mode?: unknown; cameraId?: unknown };
  if (candidate.mode !== "focus") return { mode: "wall" };
  const cameraId = normalizeMasterCameraId(candidate.cameraId);
  return cameraId ? { mode: "focus", cameraId } : { mode: "wall" };
}

export function normalizeLiveRobotModel(value: unknown): LiveRobotModel | null {
  if (typeof value === "string" && value.trim().toLowerCase() === "master") return "Master";
  return normalizeAgentechRobotModel(value);
}
