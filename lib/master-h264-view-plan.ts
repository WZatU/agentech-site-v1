import {
  MASTER_LIVE_CAMERAS,
  normalizeMasterViewSelection,
  type MasterViewSelection,
} from "./master-live-camera.ts";

export type MasterH264View = {
  cameraId: (typeof MASTER_LIVE_CAMERAS)[number]["id"];
  label: string;
  trackName: string;
  previewPath: string;
  mode: "wall" | "focus";
};

export function planMasterH264Views(selection: unknown): readonly MasterH264View[] {
  const normalized = normalizeMasterViewSelection(selection) as MasterViewSelection;
  const cameras = normalized.mode === "wall"
    ? MASTER_LIVE_CAMERAS
    : MASTER_LIVE_CAMERAS.filter(({ id }) => id === normalized.cameraId);
  return cameras.map((camera) => ({
    cameraId: camera.id,
    label: camera.label,
    trackName: camera.trackName,
    previewPath: camera.previewPath,
    mode: normalized.mode,
  }));
}
