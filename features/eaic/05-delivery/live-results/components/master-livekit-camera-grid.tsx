"use client";

import type { RemoteVideoTrack } from "livekit-client";
import type { MasterViewSelection } from "@/lib/master-live-camera";
import { resolveMasterTrackLayout } from "@/lib/master-livekit-track-state";
import { MasterLivekitVideoTile } from "./master-livekit-video-tile";

type MasterLivekitCameraGridProps = {
  selection: MasterViewSelection;
  tracksByName: ReadonlyMap<string, RemoteVideoTrack>;
};

export function MasterLivekitCameraGrid({ selection, tracksByName }: MasterLivekitCameraGridProps) {
  const publications = Array.from(tracksByName, ([trackName, track]) => ({
    trackName,
    trackSid: trackName,
    track,
  }));
  const layout = resolveMasterTrackLayout(selection, publications);

  return (
    <div className={selection.mode === "wall" ? "grid gap-2 lg:grid-cols-2" : "grid gap-2"}>
      {layout.map((slot) => (
        <MasterLivekitVideoTile
          key={slot.cameraId}
          label={slot.label}
          track={slot.publication?.track ?? null}
        />
      ))}
    </div>
  );
}
