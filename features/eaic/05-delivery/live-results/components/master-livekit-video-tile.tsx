"use client";

import type { RemoteVideoTrack } from "livekit-client";
import { useEffect, useRef, useState } from "react";

type MasterLivekitVideoTileProps = {
  label: string;
  track: RemoteVideoTrack | null;
};

type VideoStats = {
  width: number;
  height: number;
  fps: number;
};

export function MasterLivekitVideoTile({ label, track }: MasterLivekitVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stats, setStats] = useState<VideoStats>({ width: 0, height: 0, fps: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !track) {
      setStats({ width: 0, height: 0, fps: 0 });
      return;
    }

    track.setPlayoutDelay(0);
    track.attach(video);
    let callbackId = 0;
    let sampleStartedAt = performance.now();
    let frames = 0;
    const measureFrame: VideoFrameRequestCallback = (now) => {
      frames += 1;
      const elapsed = now - sampleStartedAt;
      if (elapsed >= 500) {
        setStats({
          width: video.videoWidth,
          height: video.videoHeight,
          fps: (frames * 1000) / elapsed,
        });
        frames = 0;
        sampleStartedAt = now;
      }
      callbackId = video.requestVideoFrameCallback(measureFrame);
    };
    callbackId = video.requestVideoFrameCallback(measureFrame);

    return () => {
      video.cancelVideoFrameCallback(callbackId);
      track.detach(video);
      video.srcObject = null;
    };
  }, [track]);

  return (
    <article className="relative aspect-video min-h-48 overflow-hidden border border-[#31506a] bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-contain" />
      {!track ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70 px-4 text-center text-xs text-[#aeb8c2]">
          Waiting for {label} H.264 track...
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-black/75 px-3 py-2 text-xs text-white">
        <span className="font-semibold">{label}</span>
        <span className="text-[#bfdbfe]">
          {stats.width > 0 ? `${stats.width}x${stats.height} · ${stats.fps.toFixed(1)} FPS · H.264` : "H.264 · measuring..."}
        </span>
      </div>
    </article>
  );
}
