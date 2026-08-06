"use client";

import Image from "next/image";
import { useState } from "react";
import { MASTER_MOTOR_MARKERS, type MasterMotorView } from "@/lib/master-motor-map";

function formatRange(minimum: number, maximum: number, unit: string) {
  return `${minimum > 0 ? "+" : ""}${minimum}${unit} to ${maximum > 0 ? "+" : ""}${maximum}${unit}`;
}

type RobotJointViewProps = {
  view: MasterMotorView;
  label: string;
  imageSrc: string;
  activeJoint: string | null;
  showTooltip: boolean;
  selectedJoint: string | null;
  setHoveredJoint: (joint: string | null) => void;
  setSelectedJoint: (joint: string | null) => void;
};

function RobotJointView({
  view,
  label,
  imageSrc,
  activeJoint,
  showTooltip,
  selectedJoint,
  setHoveredJoint,
  setSelectedJoint
}: RobotJointViewProps) {
  const markers = MASTER_MOTOR_MARKERS;
  const activeMarker = markers.find((marker) => marker.runtimeJoint === activeJoint) ?? null;

  return (
    <div className="overflow-hidden border border-[#b9d7f6] bg-white">
      <div className="flex items-center justify-between border-b border-[#dce7f2] px-4 py-3">
        <h3 className="text-lg font-black text-[#07142e]">{label}</h3>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#005bd6]">{markers.length} joints</span>
      </div>
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[520px] bg-white">
        <Image src={imageSrc} alt={`Clean ${label.toLowerCase()} of AgiBot X2 with yellow feet`} fill sizes="(max-width: 1024px) 92vw, 520px" className="object-contain" priority={false} />
        {markers.map((marker) => {
          const active = marker.runtimeJoint === activeJoint;
          const position = marker.positions[view];
          return (
            <button
              key={marker.runtimeJoint}
              type="button"
              aria-label={`${marker.displayName}, ${marker.jointNumber}`}
              aria-pressed={marker.runtimeJoint === selectedJoint}
              title={marker.displayName}
              onMouseEnter={() => setHoveredJoint(marker.runtimeJoint)}
              onMouseLeave={() => setHoveredJoint(null)}
              onFocus={() => setHoveredJoint(marker.runtimeJoint)}
              onBlur={() => setHoveredJoint(null)}
              onClick={() => setSelectedJoint(selectedJoint === marker.runtimeJoint ? null : marker.runtimeJoint)}
              className={`absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[9px] font-black shadow-[0_3px_10px_rgba(3,33,70,0.38)] transition focus-visible:z-30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#64b5ff] ${active ? "scale-125 border-white bg-[#ff5a1f] text-white" : "border-white bg-[#005bd6] text-white hover:scale-125 hover:bg-[#ff5a1f]"}`}
              style={{ left: `${position.xPercent}%`, top: `${position.yPercent}%` }}
            >
              {marker.jointNumber}
            </button>
          );
        })}
        {activeMarker && showTooltip ? (
          <div
            role="tooltip"
            aria-live="polite"
            className={`pointer-events-none absolute z-40 w-56 -translate-y-1/2 border border-[#9cc6ee] bg-white p-3 text-left shadow-[0_16px_38px_rgba(3,33,70,0.24)] ${activeMarker.positions[view].xPercent > 50 ? "-translate-x-[calc(100%+1rem)]" : "translate-x-4"}`}
            style={{ left: `${activeMarker.positions[view].xPercent}%`, top: `${activeMarker.positions[view].yPercent}%` }}
          >
            <div className="flex items-center gap-2">
              <span className="bg-[#005bd6] px-2 py-0.5 text-[10px] font-black text-white">{activeMarker.jointNumber}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#526174]">{activeMarker.group}</span>
            </div>
            <p className="mt-2 text-sm font-black text-[#07142e]">{activeMarker.displayName}</p>
            <p className="mt-1 break-all font-mono text-[10px] font-bold text-[#005bd6]">{activeMarker.runtimeJoint}</p>
            <div className="mt-2 border-t border-[#dce7f2] pt-2 text-[11px] leading-5 text-[#334155]">
              <p><strong>Degrees:</strong> {formatRange(activeMarker.officialLimit.minimumDegrees, activeMarker.officialLimit.maximumDegrees, "°")}</p>
              <p><strong>Runtime:</strong> {formatRange(activeMarker.runtimeLimit.minimumRadians, activeMarker.runtimeLimit.maximumRadians, " rad")}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MasterMotorMap() {
  const [selected, setSelected] = useState<{ joint: string; view: MasterMotorView } | null>(null);
  const [hovered, setHovered] = useState<{ joint: string; view: MasterMotorView } | null>(null);
  const active = hovered ?? selected;
  const selectedJoint = selected?.joint ?? null;

  return (
    <section className="mt-6 overflow-hidden border border-[#9cc6ee] bg-[#eef6ff] shadow-[0_20px_54px_rgba(12,31,58,0.10)]" aria-labelledby="master-motor-map-title">
      <div className="border-b border-[#b9d7f6] bg-white px-5 py-5 sm:px-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#005bd6]">Master joint reference</p>
        <div className="mt-2">
          <div>
            <h2 id="master-motor-map-title" className="text-3xl font-black tracking-tight text-[#07142e]">Find every motor on Master.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#334155]">Hover, focus, or tap any of the 16 arm-and-head joints to see its name and movement limits beside the motor. The same joints are mapped on both views.</p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-2">
          <RobotJointView
            view="front"
            label="Front View"
            imageSrc="/assets/robotics/agibot-x2-clean-front.png"
            activeJoint={active?.joint ?? null}
            showTooltip={active?.view === "front"}
            selectedJoint={selectedJoint}
            setHoveredJoint={(joint) => setHovered(joint ? { joint, view: "front" } : null)}
            setSelectedJoint={(joint) => setSelected(joint ? { joint, view: "front" } : null)}
          />
          <RobotJointView
            view="back"
            label="Back View"
            imageSrc="/assets/robotics/agibot-x2-clean-back.png"
            activeJoint={active?.joint ?? null}
            showTooltip={active?.view === "back"}
            selectedJoint={selectedJoint}
            setHoveredJoint={(joint) => setHovered(joint ? { joint, view: "back" } : null)}
            setSelectedJoint={(joint) => setSelected(joint ? { joint, view: "back" } : null)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#334155]">
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#005bd6]" />Motor location</span>
          <span><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[#ff5a1f]" />Active motor</span>
        </div>
        <div className="mt-5 border border-[#ffd3bd] bg-[#fff7f2] p-4 text-xs leading-5 text-[#7b2b0d]">
          <strong className="block text-sm">Reference information only</strong>
          Hover or focus a motor to see its limits. Click to pin the information box on touch devices. Published limits are not a command, trajectory, or guarantee that every pose is collision-free.
        </div>
      </div>
    </section>
  );
}
