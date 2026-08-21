"use client";

import { useState } from "react";

const jointDemos = [
  { id: "shoulder-pitch", group: "Shoulder", axis: "Pitch", motion: "Arm forward / back", joint: "right_shoulder_pitch_joint" },
  { id: "shoulder-roll", group: "Shoulder", axis: "Roll", motion: "Arm out / in", joint: "right_shoulder_roll_joint" },
  { id: "shoulder-yaw", group: "Shoulder", axis: "Yaw", motion: "Upper-arm twist", joint: "right_shoulder_yaw_joint" },
  { id: "elbow", group: "Elbow", axis: "Flexion", motion: "Bend / extend", joint: "right_elbow_joint" },
  { id: "wrist-pitch", group: "Wrist", axis: "Pitch", motion: "Hand up / down", joint: "right_wrist_pitch_joint" },
  { id: "wrist-roll", group: "Wrist", axis: "Roll", motion: "Rotate palm", joint: "right_wrist_roll_joint" },
  { id: "wrist-yaw", group: "Wrist", axis: "Yaw", motion: "Hand left / right", joint: "right_wrist_yaw_joint" },
  { id: "head-pitch", group: "Head", axis: "Pitch", motion: "Look up / down", joint: "head_pitch_joint" },
  { id: "head-yaw", group: "Head", axis: "Yaw", motion: "Turn left / right", joint: "head_yaw_joint" }
] as const;

const axisNotes = [
  { axis: "Pitch", detail: "Tilts forward and backward" },
  { axis: "Roll", detail: "Tilts side to side or rotates along the limb" },
  { axis: "Yaw", detail: "Turns or twists left and right" }
] as const;

export function MasterJointMotionGuide() {
  const [selectedId, setSelectedId] = useState<(typeof jointDemos)[number]["id"]>("shoulder-pitch");
  const selected = jointDemos.find((demo) => demo.id === selectedId) ?? jointDemos[0];

  return (
    <section className="overflow-hidden border border-[#263e63] bg-[#06162f] text-white" aria-labelledby="master-joint-motion-title">
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-b border-[#263e63] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#65b9ed]">Master motion guide</p>
          <h2 id="master-joint-motion-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            See how every joint axis moves.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#b9c8dc]">
            Select a joint to view an isolated MuJoCo demonstration. The highlighted blue section is active, while the arm uses a solid-body clearance pose to stay outside the torso.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden border border-[#263e63] bg-[#263e63]">
            {axisNotes.map((note) => (
              <div key={note.axis} className="bg-[#0a1d3a] p-3">
                <p className="text-xs font-semibold text-white">{note.axis}</p>
                <p className="mt-1 text-[10px] leading-4 text-[#9fb1c9]">{note.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3" role="list" aria-label="Master joint demonstrations">
            {jointDemos.map((demo) => {
              const active = demo.id === selected.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => setSelectedId(demo.id)}
                  aria-pressed={active}
                  className={`min-h-16 border p-3 text-left transition ${active ? "border-[#55b8f3] bg-[#12365c] shadow-[inset_3px_0_0_#55b8f3]" : "border-[#263e63] bg-[#091b36] hover:border-[#4f739d] hover:bg-[#0d2444]"}`}
                >
                  <span className={`block text-[9px] font-semibold uppercase tracking-[0.14em] ${active ? "text-[#65c4fa]" : "text-[#7891af]"}`}>{demo.group}</span>
                  <span className="mt-1 block text-xs font-semibold text-white">{demo.axis}</span>
                  <span className="mt-0.5 block text-[10px] text-[#aebdd0]">{demo.motion}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 border-l-2 border-[#55b8f3] pl-3 text-xs leading-5 text-[#aebdd0]">
            Left-arm joints use the same axes, mirrored. This is an educational simulation—not a live robot command.
          </p>
        </div>

        <div className="flex min-h-[430px] flex-col bg-[#071a34] p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#65b9ed]">{selected.group} · {selected.axis}</p>
              <p className="mt-1 text-lg font-semibold">{selected.motion}</p>
            </div>
            <code className="border border-[#29476d] bg-[#091c37] px-2 py-1 text-[10px] text-[#91a9c5]">{selected.joint}</code>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden border border-[#29476d] bg-[#0b203b]">
            <video
              key={selected.id}
              className="h-full max-h-[610px] w-full object-contain"
              src={`/assets/products/agentech-library/simulator-previews/master/joint-axes/master-${selected.id}.mp4?v=precise-joints-20260820`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`MuJoCo simulation of Master ${selected.group.toLowerCase()} ${selected.axis.toLowerCase()} motion`}
            />
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] uppercase tracking-[0.12em] text-[#7189a7]">
            <span>Official AgiBot X2 MuJoCo model</span>
            <span>Looped axis preview</span>
          </div>
        </div>
      </div>
    </section>
  );
}
