import { normalizeAgentechRobotModel, type AgentechRobotModel } from "../features/eaic/02-unified-api/resources-runs/agentech-robot-model.ts";

export const MASTER_LIVE_CAMERAS = [
  { id: "front-main", label: "Front Main", trackName: "master-front-main", previewPath: "/h264/front-main", wallResolution: "up to 1920x1080 H.264", focusResolution: "native source H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
  { id: "front-left", label: "Front Left", trackName: "master-front-left", previewPath: "/h264/front-left", wallResolution: "up to 1436x1080 H.264", focusResolution: "2064x1552 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
  { id: "front-right", label: "Front Right", trackName: "master-front-right", previewPath: "/h264/front-right", wallResolution: "up to 1436x1080 H.264", focusResolution: "2064x1552 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
  { id: "rgbd-color", label: "RGB-D Color", trackName: "master-rgbd-color", previewPath: "/h264/rgbd-color", wallResolution: "640x480 native H.264", focusResolution: "640x480 native H.264", focusFrameRate: "up to 30 FPS", targetFrameRate: 30 },
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
