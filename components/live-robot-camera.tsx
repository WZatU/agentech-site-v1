"use client";

import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type LiveRobotCameraProps = {
  roomName: string;
};

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

export function LiveRobotCamera({ roomName }: LiveRobotCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState(livekitUrl ? "Waiting for robot camera stream..." : "LiveKit URL is not configured.");

  useEffect(() => {
    if (!livekitUrl) {
      return;
    }

    let activeRoom: Room | null = null;
    let isMounted = true;

    function attachVideo(track: RemoteTrack) {
      if (!videoRef.current || track.kind !== Track.Kind.Video) {
        return;
      }

      track.attach(videoRef.current);
      setStatus("Live robot camera connected.");
    }

    async function connect() {
      try {
        setStatus("Connecting to live robot camera...");
        const response = await fetch(`/api/livekit-token?room=${encodeURIComponent(roomName)}`, { cache: "no-store" });
        const payload = (await response.json()) as { token?: string; error?: string };

        if (!response.ok || !payload.token) {
          throw new Error(payload.error || "Could not create LiveKit viewer token.");
        }

        const room = new Room({
          adaptiveStream: false,
          dynacast: false
        });
        activeRoom = room;

        room.on(RoomEvent.TrackSubscribed, (track) => {
          attachVideo(track);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach();
          if (isMounted) {
            setStatus("Robot camera stream paused.");
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          if (isMounted) {
            setStatus("Robot camera disconnected.");
          }
        });

        await room.connect(livekitUrl, payload.token);

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) {
              attachVideo(publication.track);
            }
          });
        });

        if (!Array.from(room.remoteParticipants.values()).some((participant) => Array.from(participant.trackPublications.values()).some((publication) => publication.track?.kind === Track.Kind.Video))) {
          setStatus("Connected. Start OBS streaming to show the robot camera.");
        }
      } catch (error) {
        if (isMounted) {
          setStatus(error instanceof Error ? error.message : "Could not connect to the live robot camera.");
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      activeRoom?.disconnect();
    };
  }, [roomName]);

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      {status === "Live robot camera connected." ? null : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 px-6 text-center text-sm leading-6 text-[#aeb8c2]">
          {status}
        </div>
      )}
    </div>
  );
}
