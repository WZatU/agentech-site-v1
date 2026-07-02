"use client";

import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type LiveRobotCameraProps = {
  roomName: string;
};

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

export function LiveRobotCamera({ roomName }: LiveRobotCameraProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [status, setStatus] = useState(livekitUrl ? "Press Start Live View when you are ready to watch." : "LiveKit URL is not configured.");

  useEffect(() => {
    if (!livekitUrl || !isViewing) {
      return;
    }

    let activeRoom: Room | null = null;
    const videoElement = videoRef.current;
    let isMounted = true;
    let videoConnected = false;
    let noVideoTimer: ReturnType<typeof setTimeout> | null = null;

    function attachVideo(track: RemoteTrack) {
      if (!videoElement || track.kind !== Track.Kind.Video) {
        return;
      }

      videoConnected = true;
      if (noVideoTimer) {
        clearTimeout(noVideoTimer);
        noVideoTimer = null;
      }
      track.attach(videoElement);
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
          setStatus("Waiting for the robot camera stream...");
        }

        noVideoTimer = setTimeout(() => {
          if (!isMounted || videoConnected) {
            return;
          }
          room.disconnect();
          setIsViewing(false);
          setStatus("No active robot camera stream. Live view stopped.");
        }, 15000);
      } catch (error) {
        if (isMounted) {
          setIsViewing(false);
          setStatus(error instanceof Error ? error.message : "Could not connect to the live robot camera.");
        }
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (noVideoTimer) {
        clearTimeout(noVideoTimer);
      }
      if (videoElement) {
        videoElement.srcObject = null;
      }
      activeRoom?.disconnect();
    };
  }, [roomName, isViewing]);

  useEffect(() => {
    if (!isViewing) {
      return;
    }

    function stopHiddenView() {
      if (document.hidden) {
        setIsViewing(false);
        setStatus("Live view paused because the tab is hidden.");
      }
    }

    document.addEventListener("visibilitychange", stopHiddenView);
    return () => document.removeEventListener("visibilitychange", stopHiddenView);
  }, [isViewing]);

  useEffect(() => {
    if (!isViewing || !containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsViewing(false);
          setStatus("Live view stopped because the camera is off screen.");
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isViewing]);

  function startViewing() {
    if (!livekitUrl) {
      return;
    }
    setStatus("Connecting to live robot camera...");
    setIsViewing(true);
  }

  function stopViewing() {
    setIsViewing(false);
    setStatus("Live view stopped.");
  }

  return (
    <div ref={containerRef} className="relative h-full w-full bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
      {status === "Live robot camera connected." ? null : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 px-6 text-center text-sm leading-6 text-[#aeb8c2]">
          <span>{status}</span>
          <button
            type="button"
            onClick={startViewing}
            disabled={!livekitUrl || isViewing}
            className="border border-[#8fdc8f] bg-[#17351f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a] disabled:cursor-not-allowed disabled:border-[#2a3440] disabled:bg-[#10151c] disabled:text-[#7f8c99]"
          >
            Start Live View
          </button>
        </div>
      )}
      {isViewing ? (
        <button
          type="button"
          onClick={stopViewing}
          className="absolute bottom-3 right-3 border border-[#93c5fd] bg-[#101d2e]/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f]"
        >
          Stop Live View
        </button>
      ) : null}
    </div>
  );
}
