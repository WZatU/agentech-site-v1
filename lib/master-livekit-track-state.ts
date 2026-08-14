import {
  MASTER_LIVE_CAMERAS,
  type MasterCameraId,
  type MasterViewSelection,
} from "./master-live-camera.ts";

export type MasterTrackPublicationLike = {
  trackName: string;
  trackSid: string;
};

export type MasterTrackLayoutSlot<T extends MasterTrackPublicationLike> = {
  cameraId: MasterCameraId;
  label: string;
  trackName: string;
  publication: T | null;
};

const approvedTrackNames = new Set(MASTER_LIVE_CAMERAS.map((camera) => camera.trackName));

export function resolveMasterTrackLayout<T extends MasterTrackPublicationLike>(
  selection: MasterViewSelection,
  publications: Iterable<T>,
): MasterTrackLayoutSlot<T>[] {
  const byName = new Map<string, T>();
  for (const publication of publications) {
    if (approvedTrackNames.has(publication.trackName as (typeof MASTER_LIVE_CAMERAS)[number]["trackName"])) {
      byName.set(publication.trackName, publication);
    }
  }
  return MASTER_LIVE_CAMERAS
    .filter((camera) => selection.mode === "wall" || camera.id === selection.cameraId)
    .map((camera) => ({
      cameraId: camera.id,
      label: camera.label,
      trackName: camera.trackName,
      publication: byName.get(camera.trackName) ?? null,
    }));
}

export function desiredMasterTrackSubscriptions<T extends MasterTrackPublicationLike>(
  selection: MasterViewSelection,
  publications: Iterable<T>,
) {
  const selectedTrackName = selection.mode === "focus"
    ? MASTER_LIVE_CAMERAS.find((camera) => camera.id === selection.cameraId)?.trackName
    : null;
  const byName = new Map<string, T>();
  for (const publication of publications) {
    if (approvedTrackNames.has(publication.trackName as (typeof MASTER_LIVE_CAMERAS)[number]["trackName"])) {
      byName.set(publication.trackName, publication);
    }
  }
  return MASTER_LIVE_CAMERAS.flatMap((camera) => {
    const publication = byName.get(camera.trackName);
    return publication
      ? [{
          trackSid: publication.trackSid,
          subscribe: selection.mode === "wall" || camera.trackName === selectedTrackName,
        }]
      : [];
  });
}
