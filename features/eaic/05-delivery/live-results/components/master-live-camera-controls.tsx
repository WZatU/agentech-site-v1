"use client";

import { useState } from "react";
import { MASTER_LIVE_CAMERAS, type MasterViewSelection } from "@/lib/master-live-camera";

export function MasterLiveCameraControls({ preview = false }: { preview?: boolean }) {
  const [selection, setSelection] = useState<MasterViewSelection>({ mode: "wall" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function choose(next: MasterViewSelection) {
    const previous = selection;
    setSelection(next);
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
      setSelection(payload.selection);
    } catch (caught) {
      setSelection(previous);
      setError(caught instanceof Error ? caught.message : "Could not change the Master camera view.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-3 border border-[#31506a] bg-[#101d2e] p-4 text-[#dbeafe]" aria-label="Master camera view controls">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#93c5fd]">Master Robot Vision</p>
          <p className="mt-1 text-sm leading-6">
            {selection.mode === "wall"
              ? "Camera Wall · three 1080p views inside one 4K program"
              : `${MASTER_LIVE_CAMERAS.find(({ id }) => id === selection.cameraId)?.label} · focused up to native 4K`}
          </p>
        </div>
        <span className="border border-[#375a78] bg-[#0a1624] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#bfdbfe]">
          One 4K stream max
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
      {preview ? <p className="mt-3 text-xs text-[#bfdbfe]">Master camera UI preview · no robot or live feed is connected.</p> : null}
      {error ? <p className="mt-3 text-xs text-[#fca5a5]" role="alert">{error}</p> : null}
    </section>
  );
}
