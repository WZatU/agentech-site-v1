import {
  MASTER_LIVE_CAMERAS,
  MASTER_WALL_TRACK_NAME,
  type MasterCameraId,
  type MasterViewSelection,
} from "./master-live-camera.ts";

export type MasterTrackPublicationLike = {
  trackName: string;
  trackSid: string;
};

export type MasterTrackLayoutSlot<T extends MasterTrackPublicationLike> = {
  id: "wall" | MasterCameraId;
  label: string;
  trackName: string;
  publication: T | null;
};

const approvedTrackNames = new Set<string>([
  MASTER_WALL_TRACK_NAME,
  ...MASTER_LIVE_CAMERAS.map((camera) => camera.trackName),
]);
const cameraTrackNames = new Set<string>(MASTER_LIVE_CAMERAS.map((camera) => camera.trackName));

export function expectedMasterTrack(selection: MasterViewSelection) {
  if (selection.mode === "wall") {
    return { id: "wall" as const, label: "Camera Wall", trackName: MASTER_WALL_TRACK_NAME };
  }
  const camera = MASTER_LIVE_CAMERAS.find(({ id }) => id === selection.cameraId)!;
  return { id: camera.id, label: camera.label, trackName: camera.trackName };
}

export function isApprovedMasterTrackName(trackName: string) {
  return approvedTrackNames.has(trackName);
}

export function resolveMasterTrackLayout<T extends MasterTrackPublicationLike>(
  selection: MasterViewSelection,
  publications: Iterable<T>,
): MasterTrackLayoutSlot<T>[] {
  if (selection.mode === "wall") {
    const byName = new Map(Array.from(publications, (publication) => [publication.trackName, publication]));
    return MASTER_LIVE_CAMERAS.map((camera) => ({
      id: camera.id,
      label: camera.label,
      trackName: camera.trackName,
      publication: byName.get(camera.trackName) ?? null,
    }));
  }
  const expected = expectedMasterTrack(selection);
  let matched: T | null = null;
  for (const publication of publications) {
    if (publication.trackName === expected.trackName) matched = publication;
  }
  return [{ ...expected, publication: matched }];
}

export function desiredMasterTrackSubscriptions<T extends MasterTrackPublicationLike>(
  _selection: MasterViewSelection,
  publications: Iterable<T>,
) {
  return Array.from(publications, (publication) => ({
    trackSid: publication.trackSid,
    subscribe: cameraTrackNames.has(publication.trackName),
  }));
}
