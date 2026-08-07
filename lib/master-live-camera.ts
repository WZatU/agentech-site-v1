import { normalizeAgentechRobotModel, type AgentechRobotModel } from "../features/eaic/02-unified-api/resources-runs/agentech-robot-model.ts";

export const MASTER_LIVE_CAMERAS = [
  { id: "front-main", label: "Front Main", topic: "/aima/hal/sensor/rgb_head_front_center/rgb_image/compressed" },
  { id: "front-left", label: "Front Left", topic: "/aima/hal/sensor/stereo_head_front_left/rgb_image/compressed" },
  { id: "front-right", label: "Front Right", topic: "/aima/hal/sensor/stereo_head_front_right/rgb_image/compressed" },
  { id: "rear-view", label: "Rear View", topic: "/aima/hal/sensor/rgb_head_rear/rgb_image/compressed" },
] as const;

export type MasterCameraId = (typeof MASTER_LIVE_CAMERAS)[number]["id"];
export type MasterViewSelection = { mode: "wall" } | { mode: "focus"; cameraId: MasterCameraId };
export type LiveRobotModel = AgentechRobotModel | "Master";

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
