"use client";

import { useEffect, useState } from "react";
import { MASTER_LIVE_CAMERAS, normalizeMasterViewSelection, type MasterViewSelection } from "@/lib/master-live-camera";
import { MasterDirectCameraWall } from "./master-direct-camera-wall";

type MasterLiveCameraControlsProps = {
  preview?: boolean;
  selection: MasterViewSelection;
  onSelectionChange: (selection: MasterViewSelection) => void;
};

export function MasterLiveCameraControls({ preview = false, selection, onSelectionChange }: MasterLiveCameraControlsProps) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!preview) return;
    const cameraId = new URLSearchParams(window.location.search).get("masterCamera");
    const camera = MASTER_LIVE_CAMERAS.find((camera) => camera.id === cameraId);
    if (camera) onSelectionChange({ mode: "focus", cameraId: camera.id });
  }, [onSelectionChange, preview]);

  async function choose(next: MasterViewSelection) {
    const previous = selection;
    onSelectionChange(next);
    setError("");
    if (preview) return;
    setPending(true);
    try {
      const response = await fetch("/api/master-live-camera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload = await response.json() as { selection?: MasterViewSelection; error?: string };
      if (!response.ok || !payload.selection) throw new Error(payload.error || "Could not change the Master camera view.");
      onSelectionChange(normalizeMasterViewSelection(payload.selection));
    } catch (caught) {
      onSelectionChange(previous);
      setError(caught instanceof Error ? caught.message : "Could not change the Master camera view.");
    } finally {
      setPending(false);
    }
  }

  const selectedCamera = selection.mode === "focus"
    ? MASTER_LIVE_CAMERAS.find(({ id }) => id === selection.cameraId)
    : null;

  return (
    <section className="mb-3 border border-[#31506a] bg-[#101d2e] p-4 text-[#dbeafe]" aria-label="Master camera view controls">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#93c5fd]">Master Robot Vision</p>
          <p className="mt-1 text-sm leading-6">
            {selection.mode === "wall"
              ? "JPEG camera wall · four camera views"
              : `${selectedCamera?.label} · ${selectedCamera?.focusResolution} · measured FPS shown below`}
          </p>
        </div>
        <span className="border border-[#375a78] bg-[#0a1624] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bfdbfe]">
          {selection.mode === "focus" ? `Native H.264 · ${selectedCamera?.focusFrameRate}` : "JPEG wall"}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button type="button" aria-pressed={selection.mode === "wall"} disabled={pending} onClick={() => void choose({ mode: "wall" })} className="border border-[#4b6680] px-3 py-2 text-xs font-semibold transition aria-pressed:border-[#93c5fd] aria-pressed:bg-[#1d4f78] disabled:opacity-60">Camera Wall</button>
        {MASTER_LIVE_CAMERAS.map((camera) => (
          <button key={camera.id} type="button" aria-pressed={selection.mode === "focus" && selection.cameraId === camera.id} disabled={pending} onClick={() => void choose({ mode: "focus", cameraId: camera.id })} className="border border-[#4b6680] px-3 py-2 text-xs font-semibold transition aria-pressed:border-[#93c5fd] aria-pressed:bg-[#1d4f78] disabled:opacity-60">
            {camera.label}
          </button>
        ))}
      </div>
      {preview ? (
        <MasterDirectCameraWall selection={selection} />
      ) : null}
      {preview ? <p className="mt-3 text-xs text-[#bfdbfe]">Direct wired Master preview through AGENTECH01.</p> : null}
      {error ? <p className="mt-3 text-xs text-[#fca5a5]" role="alert">{error}</p> : null}
    </section>
  );
}
