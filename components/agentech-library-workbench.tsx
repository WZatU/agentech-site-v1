"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { agentechFunctions, starterCode, type AgentechFunction } from "@/lib/agentech-library";
import { agentechLibraryTasks, getAgentechLibraryTask, type AgentechLibraryTaskSlug } from "@/lib/agentech-library-tasks";
import { LiveRobotCamera } from "@/components/live-robot-camera";

const categories = ["All", "Movement", "Posture", "Safety", "Sensing"] as const;
type Category = (typeof categories)[number];
type SimFrame = { x: number; y: number; z: number; yaw: number; pitch?: number };
type AgentechLibraryWorkbenchProps = {
  task?: AgentechLibraryTaskSlug;
};
const useRealMuJoCoPreview = process.env.NODE_ENV === "development";
const liveRobotRoomName = process.env.NEXT_PUBLIC_LIVEKIT_ROOM_NAME || "aegis-lab-1";
const liveRobotCameraConfigured = Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL);

const localPreviewAssets: Record<string, string> = {
  forward: "/assets/products/aegis-previews/forward.gif",
  backward: "/assets/products/aegis-previews/backward.gif",
  lateral_left: "/assets/products/aegis-previews/lateral_left.gif",
  lateral_right: "/assets/products/aegis-previews/lateral_right.gif",
  turn_left: "/assets/products/aegis-previews/turn_left.gif",
  turn_right: "/assets/products/aegis-previews/turn_right.gif",
  twist_left: "/assets/products/aegis-previews/twist_left.gif",
  twist_right: "/assets/products/aegis-previews/twist_right.gif",
  backflip: "/assets/products/aegis-previews/backflip.gif",
  jump: "/assets/products/aegis-previews/jump.gif",
  look_up: "/assets/products/aegis-previews/look_up.gif",
  look_down: "/assets/products/aegis-previews/look_down.gif",
  stand: "/assets/products/aegis-previews/stand.gif",
  sit: "/assets/products/aegis-previews/sit.gif",
  stop: "/assets/products/aegis-previews/stop.gif",
  emergency_stop: "/assets/products/aegis-previews/emergency_stop.gif",
  get_battery_status: "/assets/products/aegis-previews/battery_status.gif"
};
const localPreviewFallback = "/assets/products/aegis-previews/stand.gif";
const protectedStandLine = "Agentech.stand(stand_wait=5)";
const commandsRequiringStand = new Set([
  "forward",
  "backward",
  "lateral_left",
  "lateral_right",
  "turn_left",
  "turn_right",
  "twist_left",
  "twist_right",
  "backflip",
  "jump",
  "look_up",
  "look_down"
]);

function detectPrimaryPreviewCommand(code: string) {
  const lines = code.split(/\r?\n/);
  let fallbackCommand = "stand";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/(?:Agentech|dog)\.(\w+)\((.*)\)/);
    if (!match) {
      continue;
    }
    const [, command] = match;
    if (localPreviewAssets[command]) {
      if (command === "stand") {
        fallbackCommand = "stand";
        continue;
      }
      return command;
    }
  }
  return fallbackCommand;
}

function codeUsesStandRequiredCommand(code: string) {
  const pattern = /(?:Agentech|dog)\.(\w+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    if (commandsRequiringStand.has(match[1])) {
      return true;
    }
  }
  return false;
}

function codeHasStandCommand(code: string) {
  return /(?:Agentech|dog)\.stand\s*\(/.test(code);
}

function ensureRequiredStand(code: string) {
  if (!codeUsesStandRequiredCommand(code) || codeHasStandCommand(code)) {
    return code;
  }

  const lines = code.split(/\r?\n/);
  const importIndex = lines.findIndex((line) => line.trim() === "from agentech import Agentech");
  if (importIndex >= 0) {
    const nextLines = [...lines];
    nextLines.splice(importIndex + 1, 0, "", protectedStandLine);
    return nextLines.join("\n");
  }

  return `from agentech import Agentech\n\n${protectedStandLine}\n${code.trimStart()}`;
}

function previewAssetForCode(code: string, preferredCommand?: string) {
  const command = preferredCommand && localPreviewAssets[preferredCommand] ? preferredCommand : detectPrimaryPreviewCommand(code);
  return {
    command,
    gif: localPreviewAssets[command] ?? localPreviewFallback
  };
}

function previewCommandLabel(command: string) {
  const labels: Record<string, string> = {
    forward: "Forward",
    backward: "Backward",
    lateral_left: "Lateral Left",
    lateral_right: "Lateral Right",
    turn_left: "Turn Left",
    turn_right: "Turn Right",
    twist_left: "Twist Left",
    twist_right: "Twist Right",
    backflip: "Backflip",
    jump: "Jump",
    look_up: "Look Up",
    look_down: "Look Down",
    stand: "Stand",
    sit: "Sit",
    stop: "Stop",
    emergency_stop: "Emergency Stop",
    get_battery_status: "Get Battery Status"
  };
  return labels[command] ?? command;
}

const categoryExamples: Record<Category, { activeName: string; code: string }> = {
  All: {
    activeName: "stand",
    code: `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.lateral_left(speed=0.2, seconds=1)
Agentech.lateral_right(speed=0.2, seconds=1)
Agentech.turn_left(angle=45)
Agentech.turn_right(angle=45)
Agentech.twist_left(angle=28)
Agentech.twist_right(angle=28)
Agentech.backflip()
Agentech.jump()
Agentech.look_up(angle=15)
Agentech.look_down(angle=15)
print(Agentech.get_battery_status())
Agentech.stop()`
  },
  Movement: {
    activeName: "forward",
    code: `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.lateral_left(speed=0.2, seconds=1)
Agentech.lateral_right(speed=0.2, seconds=1)
Agentech.turn_left(angle=45)
Agentech.turn_right(angle=45)
Agentech.twist_left(angle=28)
Agentech.twist_right(angle=28)
Agentech.backflip()
Agentech.jump()`
  },
  Posture: {
    activeName: "stand",
    code: `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.sit()`
  },
  Safety: {
    activeName: "emergency_stop",
    code: `from agentech import Agentech

Agentech.stop()
Agentech.emergency_stop()
Agentech.get_battery_status()`
  },
  Sensing: {
    activeName: "look_up",
    code: `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.look_up(angle=15)
Agentech.look_down(angle=15)
print(Agentech.get_battery_status())`
  }
};

function commandPlan(code: string) {
  const trace: string[] = [];
  const lines = code.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/(?:Agentech|dog)\.(\w+)\((.*)\)/);
    if (!match) {
      continue;
    }

    const [, command, args] = match;
    const displayArgs = args.trim() ? `(${args.trim()})` : "()";
    trace.push(`${command}${displayArgs}`);
  }

  return {
    trace: trace.length ? trace : ["No Agentech commands found yet."],
    motionCount: trace.filter((line) => /forward|backward|lateral_left|lateral_right|turn_left|turn_right|twist_left|twist_right|backflip|jump|look_up|look_down/.test(line)).length
  };
}

function FunctionReference({ item }: { item: AgentechFunction }) {
  return (
    <div className="border border-[#2a3440] bg-[#11151b]">
      <div className="border-b border-[#2a3440] bg-[#181d24] px-4 py-3">
        <p className="font-mono text-sm text-[#8fdc8f]">{item.signature}</p>
      </div>
      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <p className="text-sm leading-6 text-[#cdd6df]">{item.summary}</p>
          <div className="mt-4 overflow-hidden border border-[#2a3440]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0d1117] text-xs uppercase tracking-[0.14em] text-[#7f8c99]">
                <tr>
                  <th className="px-3 py-2">Parameter</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Default</th>
                  <th className="px-3 py-2">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a3440] text-[#cdd6df]">
                {item.params.length ? (
                  item.params.map((param) => (
                    <tr key={param.name}>
                      <td className="px-3 py-2 font-mono text-[#8fdc8f]">{param.name}</td>
                      <td className="px-3 py-2 font-mono text-[#93c5fd]">{param.type}</td>
                      <td className="px-3 py-2 font-mono text-[#f5d06f]">{param.defaultValue ?? "required"}</td>
                      <td className="px-3 py-2 text-[#aeb8c2]">{param.description}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-3 text-[#aeb8c2]" colSpan={4}>
                      No parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3">
          <div className="border border-[#2a3440] bg-[#0d1117] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Student Call</p>
            <p className="mt-2 font-mono text-sm text-[#8fdc8f]">{item.signature}</p>
          </div>
          <pre className="overflow-x-auto border border-[#2a3440] bg-[#0d1117] p-3 font-mono text-xs leading-5 text-[#e5edf5]">
            {item.example}
          </pre>
        </div>
      </div>
    </div>
  );
}

function DocsOverview() {
  const groupedFunctions = categories
    .filter((category) => category !== "All")
    .map((category) => ({
      category,
      items: agentechFunctions.filter((item) => item.category === category)
    }));

  return (
    <section className="border-b border-[#2a3440] bg-[#0f1318]">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fdc8f]">Library Documentation</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Start here: install, import, call one function.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#b8c2cc]">
              This page is the documentation. Students can learn the public Agentech API, see every beginner function, preview approved motion GIFs, and upload code for robot review without leaving this screen.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#agentech-docs" className="border border-[#8fdc8f] bg-[#17351f] px-4 py-2 text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a]">
                Read Full Docs
              </a>
              <a href="#complete-function-reference" className="border border-[#93c5fd] bg-[#101d2e] px-4 py-2 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f]">
                Function Reference
              </a>
              <a href="#code-workbench" className="border border-[#2a3440] bg-[#0d1117] px-4 py-2 text-sm font-semibold text-[#cdd6df] transition hover:border-[#8fdc8f] hover:text-white">
                Try Code
              </a>
            </div>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Quick Start</p>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#e5edf5]">{`pip install git+https://github.com/agent-tech0316/agentech_sdk.git

from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.lateral_left(speed=0.2, seconds=1)
Agentech.lateral_right(speed=0.2, seconds=1)`}</pre>
          </div>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden border border-[#2a3440] bg-[#2a3440] md:grid-cols-2 lg:grid-cols-3">
          {groupedFunctions.map((group) => (
            <div key={group.category} className="bg-[#0d1117] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">{group.category}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setTimeout(() => {
                        document.getElementById("code-workbench")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 0);
                    }}
                    className="border border-[#2a3440] bg-[#11151b] px-2 py-1 font-mono text-xs text-[#cdd6df]"
                    title={item.summary}
                  >
                    {item.name}()
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DocsSection() {
  const beginnerFunctions = agentechFunctions.filter((item) =>
    [
      "forward",
      "backward",
      "lateral_left",
      "lateral_right",
      "turn_left",
      "turn_right",
      "twist_left",
      "twist_right",
      "backflip",
      "jump",
      "look_up",
      "look_down",
      "stand",
      "sit",
      "stop",
      "emergency_stop",
      "get_battery_status"
    ].includes(item.name)
  );
  const workflowExample = `from agentech import Agentech

with Agentech.robot(dry_run=True) as dog:
    dog.stand(stand_wait=5)
    dog.forward(speed=0.25, seconds=1)
    dog.backward(speed=0.2, seconds=1)
    dog.lateral_left(speed=0.2, seconds=1)
    dog.lateral_right(speed=0.2, seconds=1)
    dog.turn_left(angle=45)
    dog.twist_right(angle=28)
    dog.backflip()
    dog.jump()
    dog.look_up(angle=15)
    dog.look_down(angle=15)
    battery = dog.get_battery_status()
    dog.stop()`;
  const submitExample = `# Option 1: paste code into this page
Agentech.stand(stand_wait=5)
Agentech.forward()
Agentech.lateral_left(speed=0.2, seconds=1)

# Option 2: upload a Python file on this page
file = "submission_code.py"`; 
  const robotRunnerExample = `# student_forward.py
from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.forward()

# After review, the scheduled robot session sends approved code
# to the Raspberry Pi bridge connected to the robot hotspot.`;
  const liveRunExample = `Student code -> Website submission -> Human review -> Scheduled slot
Scheduled slot -> Pi bridge -> Robot hotspot -> Aegis dog executes
Live camera -> Website viewer -> Student watches the run`;

  return (
    <section id="agentech-docs" className="border-t border-[#2a3440] bg-[#0f1318]">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fdc8f]">Agentech Docs</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">One page to install, write, preview, and submit robot dog code.</h2>
          <p className="mt-4 text-sm leading-7 text-[#b8c2cc]">
            These docs are written for students and developers who need to move the Aegis robot quickly using the public Agentech API. The common path is simple: install the package, import Agentech, write one-line commands, preview approved action clips, then upload code for a reviewed robot session.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="border border-[#2a3440] bg-[#0d1117] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">1. Install</p>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#8fdc8f]">pip install git+https://github.com/agent-tech0316/agentech_sdk.git</pre>
            <p className="mt-3 text-sm leading-6 text-[#aeb8c2]">Use this GitHub install now. Later, after PyPI publishing, the target command becomes `pip install agentech`.</p>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">2. Import</p>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#e5edf5]">from agentech import Agentech</pre>
            <p className="mt-3 text-sm leading-6 text-[#aeb8c2]">Everything students and developer profiles need starts from this one class. The method names are intentionally plain English.</p>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">3. Run Safely</p>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#e5edf5]">with Agentech.robot(dry_run=True) as dog:</pre>
            <p className="mt-3 text-sm leading-6 text-[#aeb8c2]">Use dry-run on laptops. Use a supervised robot session before allowing real hardware movement.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#2a3440] bg-[#0d1117]">
            <div className="border-b border-[#2a3440] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Beginner API</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#11151b] text-xs uppercase tracking-[0.14em] text-[#7f8c99]">
                  <tr>
                    <th className="px-4 py-3">Function</th>
                    <th className="px-4 py-3">Use it for</th>
                    <th className="px-4 py-3">Easy parameters</th>
                    <th className="px-4 py-3">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a3440] text-[#cdd6df]">
                  {beginnerFunctions.map((item) => (
                    <tr key={item.name}>
                      <td className="px-4 py-3 font-mono text-[#8fdc8f]">{item.signature}</td>
                      <td className="px-4 py-3 text-[#aeb8c2]">{item.summary}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#f5d06f]">
                        {item.params.length ? item.params.map((param) => `${param.name}=${param.defaultValue ?? "required"}`).join(", ") : "none"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#93c5fd]">{item.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-[#2a3440] bg-[#0d1117] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Safety Limits</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[#cdd6df]">
                <p>Linear speed is capped at 2.37 m/s.</p>
                <p>Backward speed is capped at 2.365 m/s.</p>
                <p>Lateral speed benchmark is 0.78 m/s.</p>
                <p>Yaw rate is capped at +/-2.09 rad/s; slow yaw reference is 1.05 rad/s.</p>
                <p>Look up and look down are capped at 25 degrees so the dog does not tilt unrealistically.</p>
                <p>Roll benchmark limit is 28 degrees.</p>
                <p>Pitch velocity is capped at +/-0.5 rad/s.</p>
                <p>Linear acceleration benchmark is about 2.5 m/s^2.</p>
                <p>Motion commands are capped at 10 seconds.</p>
                <p>`Agentech.stop()` stops normal motion. `Agentech.emergency_stop()` enters damping mode.</p>
              </div>
            </div>
            <div className="border border-[#2a3440] bg-[#0d1117] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Official Preview</p>
              <p className="mt-3 text-sm leading-6 text-[#cdd6df]">
                The official website shows approved GIF previews only. The preview is for learning and review; the real robot moves later during a scheduled supervised run.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="border border-[#2a3440] bg-[#0d1117]">
            <div className="border-b border-[#2a3440] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Real Example: Height Photos</p>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[#e5edf5]">{workflowExample}</pre>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117]">
            <div className="border-b border-[#2a3440] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Submit Workflow</p>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[#e5edf5]">{submitExample}</pre>
            <div className="border-t border-[#2a3440] p-4 text-sm leading-6 text-[#aeb8c2]">
              Students can paste code directly into the editor or upload a Python file. The request is stored for review before any supervised live robot run.
            </div>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] lg:col-span-2">
            <div className="border-b border-[#2a3440] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Scheduled Robot Run</p>
            </div>
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[#e5edf5]">{robotRunnerExample}</pre>
              <div className="border-t border-[#2a3440] p-4 text-sm leading-6 text-[#aeb8c2] lg:border-l lg:border-t-0">
                The student file stays tiny. After review and scheduling, the website sends approved code to the Raspberry Pi bridge. The Pi is connected to the robot hotspot, runs the code on the robot, and the live camera stream lets the student watch the result on the website.
              </div>
            </div>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] lg:col-span-2">
            <div className="border-b border-[#2a3440] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">End-To-End Process</p>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[#e5edf5]">{liveRunExample}</pre>
          </div>
        </div>

        <div id="complete-function-reference" className="mt-8 scroll-mt-6 border border-[#2a3440] bg-[#0d1117]">
          <div className="border-b border-[#2a3440] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Complete Function Reference</p>
          </div>
          <div className="grid gap-px bg-[#2a3440] md:grid-cols-2 xl:grid-cols-3">
            {agentechFunctions.map((item) => (
              <div key={item.name} className="bg-[#0d1117] p-4">
                <p className="font-mono text-sm text-[#8fdc8f]">{item.signature}</p>
                <p className="mt-2 min-h-12 text-sm leading-6 text-[#cdd6df]">{item.summary}</p>
                <div className="mt-4 border-t border-[#2a3440] pt-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Parameters</p>
                  {item.params.length ? (
                    <div className="mt-2 space-y-2">
                      {item.params.map((param) => (
                        <div key={param.name} className="border border-[#26313c] bg-[#090d12] p-2">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-mono text-xs text-[#8fdc8f]">{param.name}</span>
                            <span className="font-mono text-[11px] text-[#93c5fd]">{param.type}</span>
                            <span className="font-mono text-[11px] text-[#f5d06f]">default {param.defaultValue ?? "required"}</span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-[#aeb8c2]">{param.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-[#aeb8c2]">No parameters.</p>
                  )}
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Public API</p>
                <p className="mt-1 font-mono text-xs leading-5 text-[#93c5fd]">{item.signature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const taskFeatureNotes: Record<AgentechLibraryTaskSlug, string> = {
  "start-coding": "Install commands, starter imports, and the beginner quick-start docs are collected here.",
  "view-sdk": "Browse the SDK by category, open function details only when needed, and preview the matching motion GIF.",
  submit: "Physical safety runs first. Software Check unlocks after that gate passes, and live testing unlocks only when both pass.",
  "watch-live-run": "Use the live camera module to watch the supervised session when a room is configured."
};

function TaskDetailHeader({ task }: { task: NonNullable<ReturnType<typeof getAgentechLibraryTask>> }) {
  const isLightTask = task.slug !== "view-sdk";

  return (
    <section className={isLightTask ? "border-b border-[#dce7f2] bg-[#fbfdff]" : "border-b border-[#2a3440] bg-[#0f1318]"}>
      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/agentech-products/agentech-library"
            className={
              isLightTask
                ? "border border-[#dce7f2] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#07142e] shadow-sm transition hover:border-[#008a7a] hover:text-[#008a7a]"
                : "border border-[#2a3440] bg-[#0d1117] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#cdd6df] transition hover:border-[#8fdc8f] hover:text-white"
            }
          >
            &lt;- Library Flow
          </Link>
          <div className="flex flex-wrap gap-2">
            {agentechLibraryTasks.map((item) => (
              <Link
                key={item.slug}
                href={`/agentech-products/agentech-library/${item.slug}`}
                className={`border px-2.5 py-1.5 font-mono text-xs transition ${
                  item.slug === task.slug
                    ? isLightTask
                      ? "border-[#008a7a] bg-[#e8f7f3] text-[#006a5c]"
                      : "border-[#8fdc8f] bg-[#17351f] text-[#dfffe0]"
                    : isLightTask
                      ? "border-[#dce7f2] bg-white text-[#526174] hover:border-[#008a7a] hover:text-[#008a7a]"
                      : "border-[#2a3440] bg-[#0d1117] text-[#7f8c99] hover:border-[#93c5fd] hover:text-white"
                }`}
              >
                {item.number}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
          <div className="grid h-20 w-20 place-items-center rounded-[8px] font-mono text-3xl font-bold text-white" style={{ background: task.accent }}>
            {task.number}
          </div>
          <div>
            <p className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${isLightTask ? "text-[#008a7a]" : "text-[#8fdc8f]"}`}>Command Library Task</p>
            <h1 className={`mt-2 text-4xl font-semibold tracking-tight md:text-5xl ${isLightTask ? "text-[#07142e]" : "text-white"}`}>{task.title}</h1>
            <p className={`mt-3 max-w-3xl text-sm leading-7 ${isLightTask ? "text-[#23304a]" : "text-[#b8c2cc]"}`}>{taskFeatureNotes[task.slug]}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FocusedLiveRunSection() {
  return (
    <section className="bg-[#fbfdff] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="border border-[#dce7f2] bg-white shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce7f2] px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#008a7a]">Live Robot Camera</p>
              <p className="mt-1 text-xs leading-5 text-[#526174]">
                {liveRobotCameraConfigured ? "Official supervised-session camera feed." : "LiveKit camera feed is not configured yet."}
              </p>
            </div>
            <span className={`h-3 w-3 ${liveRobotCameraConfigured ? "bg-[#008a7a]" : "bg-[#9aa8b8]"}`} aria-hidden="true" />
          </div>
          <div className="bg-black p-3">
            <div className="mx-auto aspect-video w-full max-w-5xl overflow-hidden border border-[#0b1220] bg-black">
              <LiveRobotCamera roomName={liveRobotRoomName} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FocusedStartCodingSection() {
  const setupSteps = [
    {
      label: "01",
      title: "Install the SDK",
      body: "Run the GitHub package install in your terminal before writing robot commands.",
      code: "pip install git+https://github.com/agent-tech0316/agentech_sdk.git"
    },
    {
      label: "02",
      title: "Import Agentech",
      body: "Every beginner command starts from the same readable Python import.",
      code: "from agentech import Agentech"
    },
    {
      label: "03",
      title: "Stand first",
      body: "Movement examples begin with a stand command so the robot is ready before motion.",
      code: "Agentech.stand(stand_wait=5)"
    },
    {
      label: "04",
      title: "Move, then stop",
      body: "Keep early commands short. Preview first, then submit for review when the sequence is stable.",
      code: "Agentech.forward(speed=0.3, seconds=1)\nAgentech.stop()"
    }
  ];

  const recipes = [
    {
      title: "First Forward Step",
      code: `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.forward(speed=0.3, seconds=1)
Agentech.stop()`
    },
    {
      title: "Posture Check",
      code: `from agentech import Agentech

Agentech.stand(stand_wait=5)
Agentech.sit()`
    },
    {
      title: "Battery Check",
      code: `from agentech import Agentech

print(Agentech.get_battery_status())`
    }
  ];

  return (
    <section className="bg-[#fbfdff] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-[#dce7f2] bg-white shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
            <div className="relative h-72 overflow-hidden border-b border-[#dce7f2] bg-white">
              <Image
                src="/assets/products/agentech-library/dog-blueprint.png"
                alt="Aegis robot dog blueprint"
                fill
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-contain p-4"
              />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#008a7a]">Beginner Path</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#07142e]">Your first Aegis script in four moves.</h2>
              <p className="mt-3 text-sm leading-7 text-[#23304a]">
                Start with one safe motion. Keep the file small, preview the command, then move to review once the sequence is readable.
              </p>
              <div className="mt-5 grid gap-px overflow-hidden border border-[#dce7f2] bg-[#dce7f2] sm:grid-cols-3">
                {["Install", "Write", "Preview"].map((item) => (
                  <div key={item} className="bg-[#f8fbff] p-3 text-center font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#005bd6]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {setupSteps.map((step) => (
              <div key={step.label} className="grid gap-4 border border-[#dce7f2] bg-white p-4 shadow-[0_12px_30px_rgba(12,31,58,0.06)] sm:grid-cols-[72px_minmax(0,1fr)]">
                <div className="grid h-14 w-14 place-items-center rounded-[8px] bg-[#008a6c] font-mono text-xl font-bold text-white">
                  {step.label}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold text-[#07142e]">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#23304a]">{step.body}</p>
                  <pre className="mt-3 overflow-x-auto border border-[#dce7f2] bg-[#f8fbff] p-3 font-mono text-xs leading-6 text-[#006a5c]">{step.code}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div key={recipe.title} className="border border-[#dce7f2] bg-white shadow-[0_12px_30px_rgba(12,31,58,0.06)]">
              <div className="border-b border-[#dce7f2] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">{recipe.title}</p>
              </div>
              <pre className="min-h-56 overflow-x-auto bg-[#fbfdff] p-4 font-mono text-xs leading-6 text-[#07142e]">{recipe.code}</pre>
            </div>
          ))}
        </div>

        <div className="mt-6 border border-[#dce7f2] bg-white p-5 shadow-[0_12px_30px_rgba(12,31,58,0.06)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a35d00]">Starter Rules</p>
          <div className="mt-4 grid gap-px overflow-hidden border border-[#dce7f2] bg-[#dce7f2] md:grid-cols-4">
            {[
              "Use stand before motion",
              "Keep motion under 10 seconds",
              "Preview before review",
              "Stop at the end"
            ].map((rule) => (
              <div key={rule} className="bg-[#f8fbff] p-4 text-sm font-semibold leading-6 text-[#23304a]">
                {rule}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FocusedBrowseFunctionsSection() {
  const groupedFunctions = categories
    .filter((category) => category !== "All")
    .map((category) => ({
      category,
      items: agentechFunctions.filter((item) => item.category === category)
    }));
  const safetyLimits = [
    "Dry-run before hardware",
    "10s max per motion",
    "Speed caps enforced",
    "Emergency stop available"
  ];
  const tutorialCards = [
    {
      title: "Read the signature",
      body: "Use the compact row for the function name and default parameters."
    },
    {
      title: "Open details",
      body: "Details reveal definitions, parameter meanings, examples, and GIF previews."
    },
    {
      title: "Copy into Submit",
      body: "Move working sequences to the submit page after previewing the intended behavior."
    }
  ];

  return (
    <section className="bg-[#0b0d10] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="border border-[#2a3440] bg-[#0d1117] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#93c5fd]">SDK Tutorial</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Find a command, open details, preview the motion.</h2>
            <div className="mt-5 grid gap-px overflow-hidden border border-[#2a3440] bg-[#2a3440] md:grid-cols-3">
              {tutorialCards.map((card) => (
                <div key={card.title} className="bg-[#090d12] p-4">
                  <p className="text-sm font-semibold text-white">{card.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#aeb8c2]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-[#ff7a3d] bg-[#180f0a] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ff9a66]">Safety Limits</p>
            <div className="mt-4 grid gap-2">
              {safetyLimits.map((limit) => (
                <div key={limit} className="border border-[#3c2a22] bg-[#100b08] px-3 py-2 text-sm font-semibold text-[#ffd2bd]">
                  {limit}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden border border-[#2a3440] bg-[#2a3440] md:grid-cols-4">
          {groupedFunctions.map((group) => (
            <a key={group.category} href={`#function-${group.category.toLowerCase()}`} className="bg-[#0d1117] p-4 transition hover:bg-[#111923]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">{group.category}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{group.items.length}</p>
              <p className="mt-1 text-xs leading-5 text-[#aeb8c2]">commands</p>
            </a>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {groupedFunctions.map((group) => (
            <details
              key={group.category}
              id={`function-${group.category.toLowerCase()}`}
              className="group/category scroll-mt-6 border border-[#2a3440] bg-[#0d1117]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#111923]">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#8fdc8f]">{group.category}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">{group.category} Commands</h2>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm text-[#93c5fd]">{group.items.length} functions</span>
                  <span className="border border-[#2a3440] px-3 py-1 font-mono text-xs text-[#8fdc8f] group-open/category:hidden">View functions</span>
                  <span className="hidden border border-[#8fdc8f] bg-[#17351f] px-3 py-1 font-mono text-xs text-[#dfffe0] group-open/category:inline">Hide functions</span>
                </div>
              </summary>
              <div className="divide-y divide-[#2a3440]">
                {group.items.map((item) => (
                  <details key={item.name} className="group bg-[#0d1117]">
                    <summary className="grid cursor-pointer list-none items-center gap-3 px-4 py-4 transition hover:bg-[#111923] md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1fr)_auto]">
                      <p className="font-mono text-sm text-[#8fdc8f]">Agentech.{item.name}({item.params.length ? "parameters" : ""})</p>
                      <p className="text-sm leading-6 text-[#cdd6df]">{item.summary}</p>
                      <span className="justify-self-start border border-[#2a3440] px-3 py-1 font-mono text-xs text-[#93c5fd] group-open:border-[#8fdc8f] group-open:text-[#8fdc8f] md:justify-self-end">
                        details
                      </span>
                    </summary>
                    <div className="grid gap-px border-t border-[#2a3440] bg-[#2a3440] lg:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="bg-[#090d12] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Definition</p>
                        <p className="mt-2 font-mono text-sm text-[#8fdc8f]">{item.signature}</p>
                        <p className="mt-2 text-sm leading-6 text-[#cdd6df]">{item.summary}</p>
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Parameters</p>
                        <div className="mt-2 grid gap-2">
                          {item.params.length ? (
                            item.params.map((param) => (
                              <div key={param.name} className="border border-[#26313c] bg-[#0d1117] p-3">
                                <div className="flex flex-wrap gap-2">
                                  <span className="font-mono text-xs text-[#8fdc8f]">{param.name}</span>
                                  <span className="font-mono text-xs text-[#93c5fd]">{param.type}</span>
                                  <span className="font-mono text-xs text-[#f5d06f]">default {param.defaultValue ?? "required"}</span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[#aeb8c2]">{param.description}</p>
                              </div>
                            ))
                          ) : (
                            <p className="border border-[#26313c] bg-[#0d1117] p-3 text-xs text-[#aeb8c2]">No parameters.</p>
                          )}
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Example</p>
                        <pre className="mt-2 overflow-x-auto border border-[#26313c] bg-[#0d1117] p-3 font-mono text-xs leading-6 text-[#e5edf5]">{item.example}</pre>
                      </div>
                      <div className="bg-black p-4">
                        <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-[#8fdc8f]">{item.name} preview</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={localPreviewAssets[item.name] ?? localPreviewFallback}
                          alt={`Aegis preview for ${previewCommandLabel(item.name)}`}
                          loading="lazy"
                          className="aspect-video w-full border border-[#2a3440] bg-black object-contain"
                        />
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AgentechLibraryWorkbench({ task }: AgentechLibraryWorkbenchProps = {}) {
  const [code, setCode] = useState(starterCode);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeName, setActiveName] = useState("stand");
  const [requestStatus, setRequestStatus] = useState("Ready for the two-gate review. Physical safety runs first, then Software Check uses account credits.");
  const [developerName, setDeveloperName] = useState("");
  const [robotModel, setRobotModel] = useState("Aegis Ultra");
  const [runMode, setRunMode] = useState("Software check");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [physicalSubmissionId, setPhysicalSubmissionId] = useState("");
  const [physicalSafetyPassed, setPhysicalSafetyPassed] = useState(false);
  const [isRunningPhysicalCheck, setIsRunningPhysicalCheck] = useState(false);
  const [isRunningSoftwareCheck, setIsRunningSoftwareCheck] = useState(false);
  const [canScheduleRobotSlot, setCanScheduleRobotSlot] = useState(false);
  const initialPreview = previewAssetForCode(starterCode, "stand");
  const [previewGif, setPreviewGif] = useState<string>(initialPreview.gif);
  const [previewCommand, setPreviewCommand] = useState<string>(initialPreview.command);
  const [previewStatus, setPreviewStatus] = useState(
    useRealMuJoCoPreview ? "Local simulator preview ready. Run your code to render the real Aegis model." : "Official GIF preview ready. Run your code to play a matching clip."
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simFrames, setSimFrames] = useState<SimFrame[]>([{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }]);
  const [simFrameIndex, setSimFrameIndex] = useState(0);
  const [renderedFrames, setRenderedFrames] = useState<string[]>([]);

  const filteredFunctions = useMemo(
    () => agentechFunctions.filter((item) => activeCategory === "All" || item.category === activeCategory),
    [activeCategory]
  );

  const activeFunction = agentechFunctions.find((item) => item.name === activeName) ?? agentechFunctions[0];
  const plan = useMemo(() => commandPlan(code), [code]);
  const renderedFrame = renderedFrames[Math.min(simFrameIndex, renderedFrames.length - 1)];
  const previewFrameCount = renderedFrames.length || simFrames.length;
  const selectedTask = task ? getAgentechLibraryTask(task) : undefined;
  const showHero = !selectedTask;
  const showOverview = !selectedTask;
  const showWorkbench = !selectedTask;
  const showFocusedSubmitReview = selectedTask?.slug === "submit";
  const showFocusedStartCoding = selectedTask?.slug === "start-coding";
  const showFocusedBrowseFunctions = selectedTask?.slug === "view-sdk";
  const showFocusedLiveRun = selectedTask?.slug === "watch-live-run";
  const showDocs = !selectedTask;
  const useLightTaskPage = Boolean(selectedTask && selectedTask.slug !== "view-sdk");

  useEffect(() => {
    if (renderedFrames.length <= 1) {
      return;
    }

    setSimFrameIndex(0);
    const interval = window.setInterval(() => {
      setSimFrameIndex((current) => (current >= renderedFrames.length - 1 ? 0 : current + 1));
    }, 42);

    return () => window.clearInterval(interval);
  }, [renderedFrames]);

  function resetPreview(nextCode = code, preferredCommand?: string) {
    const nextPreview = previewAssetForCode(nextCode, preferredCommand);
    setPreviewStatus(
      useRealMuJoCoPreview ? "Local simulator preview ready. Run your code to render the real Aegis model." : "Official GIF preview ready. Run your code to play a matching clip."
    );
    setPreviewGif(nextPreview.gif);
    setPreviewCommand(nextPreview.command);
    setRenderedFrames([]);
    setSimFrames([{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }]);
    setSimFrameIndex(0);
  }

  function updateCode(nextCode: string, preferredCommand?: string) {
    const normalizedCode = ensureRequiredStand(nextCode);
    setCode(normalizedCode);
    setPhysicalSubmissionId("");
    setPhysicalSafetyPassed(false);
    setCanScheduleRobotSlot(false);
    resetPreview(normalizedCode, preferredCommand);
  }

  async function loadUploadedCodeFile(file: File | null) {
    if (!file) {
      return;
    }

    const text = await file.text();
    setUploadedFileName(file.name);
    updateCode(text);
    setRequestStatus(`${file.name} loaded. Run the physical safety check first.`);
  }

  function loadExample(item: AgentechFunction) {
    const nextCode = ensureRequiredStand(`from agentech import Agentech\n\n${item.example}`);
    setActiveName(item.name);
    updateCode(nextCode, item.name);
  }

  function loadCategory(category: Category) {
    const example = categoryExamples[category];
    setActiveCategory(category);
    setActiveName(example.activeName);
    updateCode(example.code, example.activeName);
  }

  async function runPreviewSimulation() {
    const runnableCode = ensureRequiredStand(code);
    if (runnableCode !== code) {
      setCode(runnableCode);
    }
    setIsSimulating(true);
    const primary = detectPrimaryPreviewCommand(runnableCode);
    setPreviewCommand(primary);
    setPreviewGif(localPreviewAssets[primary] ?? localPreviewFallback);
    setRenderedFrames([]);
    setSimFrameIndex(0);

    if (!useRealMuJoCoPreview) {
      setPreviewStatus(`Playing official GIF preview for ${previewCommandLabel(primary)}.`);
      setIsSimulating(false);
      return;
    }

    setPreviewStatus("Running local simulator preview...");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/agentech-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: runnableCode }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({ error: "Simulation returned an unreadable response." }));
      if (!response.ok) {
        throw new Error(payload.error ?? "Simulation failed");
      }
      const frames = Array.isArray(payload.frames) && payload.frames.length ? payload.frames : [];
      const rendered = Array.isArray(payload.rendered_frames) ? payload.rendered_frames : [];
      setSimFrames(frames.length ? frames : [{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }]);
      setRenderedFrames(rendered);
      const pose = payload.final_pose ?? frames.at(-1) ?? {};
      const yaw = Number(pose.yaw ?? 0);
      const pitch = Number(pose.pitch ?? 0);
      setPreviewStatus(`Local simulator rendered ${payload.steps ?? 0} steps. yaw=${yaw.toFixed(1)}deg, tilt=${pitch.toFixed(1)}deg.`);
    } catch (error) {
      setRenderedFrames([]);
      setPreviewStatus(
        error instanceof Error && error.name === "AbortError"
          ? `Local simulator timed out. Showing ${previewCommandLabel(primary)} GIF instead.`
          : error instanceof Error
            ? `${error.message} Showing ${previewCommandLabel(primary)} GIF instead.`
            : `Local simulator failed. Showing ${previewCommandLabel(primary)} GIF instead.`
      );
    } finally {
      window.clearTimeout(timeout);
      setIsSimulating(false);
    }
  }

  async function runPhysicalSafetyCheck() {
    const reviewCode = ensureRequiredStand(code);
    if (reviewCode !== code) {
      setCode(reviewCode);
    }
    const reviewPlan = commandPlan(reviewCode);
    setIsRunningPhysicalCheck(true);
    setPhysicalSubmissionId("");
    setPhysicalSafetyPassed(false);
    setCanScheduleRobotSlot(false);
    setRequestStatus("Running physical safety check...");
    try {
      const response = await fetch("/api/agentech-code-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStage: "physical",
          developerName,
          robotModel,
          runMode,
          code: reviewCode,
          uploadedFileName,
          commands: reviewPlan.trace
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Physical safety check failed.");
      }
      setPhysicalSubmissionId(payload.id);
      setPhysicalSafetyPassed(true);
      setRequestStatus(`Physical safety passed for ${payload.commandCount} commands. Software Check is now unlocked. Review ID: ${payload.id}.`);
    } catch (error) {
      setPhysicalSubmissionId("");
      setPhysicalSafetyPassed(false);
      setCanScheduleRobotSlot(false);
      setRequestStatus(error instanceof Error ? error.message : "Physical safety check failed.");
    } finally {
      setIsRunningPhysicalCheck(false);
    }
  }

  async function runSoftwareCheck() {
    if (!physicalSubmissionId || !physicalSafetyPassed) {
      setRequestStatus("Run and pass the physical safety check before starting Software Check.");
      return;
    }

    const reviewCode = ensureRequiredStand(code);
    const reviewPlan = commandPlan(reviewCode);
    setIsRunningSoftwareCheck(true);
    setCanScheduleRobotSlot(false);
    setRequestStatus("Running Software Check with OpenAI...");
    try {
      const response = await fetch("/api/agentech-code-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStage: "software",
          submissionId: physicalSubmissionId,
          developerName,
          robotModel,
          runMode,
          code: reviewCode,
          uploadedFileName,
          commands: reviewPlan.trace
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        const findings = Array.isArray(payload.findings) && payload.findings.length
          ? ` Findings: ${payload.findings.slice(0, 3).join(" ")}`
          : "";
        throw new Error(`${payload.error ?? "Software Check failed."}${findings}`);
      }
      setRequestStatus(`Software Check passed. ${payload.creditsCharged} account credit${payload.creditsCharged === 1 ? "" : "s"} used. Live robot testing is now unlocked.`);
      setCanScheduleRobotSlot(payload.aiSecurityStatus === "passed");
    } catch (error) {
      setCanScheduleRobotSlot(false);
      setRequestStatus(error instanceof Error ? error.message : "Software Check failed.");
    } finally {
      setIsRunningSoftwareCheck(false);
    }
  }

  return (
    <div className={`min-h-screen ${useLightTaskPage ? "bg-[#fbfdff] text-[#07142e]" : "bg-[#0b0d10] text-white"}`}>
      <style>{`
        nextjs-portal,
        [data-nextjs-toast],
        [data-nextjs-dialog-overlay],
        [data-nextjs-dialog],
        [data-nextjs-dev-tools-button],
        [data-nextjs-devtools] {
          display: none !important;
        }
      `}</style>
      {selectedTask ? <TaskDetailHeader task={selectedTask} /> : null}
      {showHero ? (
      <section className="border-b border-[#2a3440] bg-[#101418]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" aria-label="Go to Agentech homepage" className="block border border-transparent transition hover:border-[#8fdc8f]/40">
                <Image
                  src="/assets/logo/AGENTECH-products.png"
                  alt="Agentech Products"
                  width={260}
                  height={64}
                  className="h-9 w-auto object-contain"
                  priority
                />
              </Link>
              <span className="border border-[#8fdc8f]/50 bg-[#132117] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8fdc8f]">
                Hidden Developer Lab
              </span>
              <Link
                href="/"
                className="border border-[#2a3440] bg-[#0d1117] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#cdd6df] transition hover:border-[#93c5fd] hover:text-[#93c5fd]"
              >
                Home
              </Link>
            </div>
            <h1 className="mt-8 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Agentech Robot Dog Library
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#b8c2cc]">
              A clean Python layer for Aegis robot commands: stand, forward, backward, lateral walking, turns, twist, backflip, jump, posture, stop, and battery status in calls students can read at a glance.
            </p>
            <div className="mt-7 grid max-w-2xl grid-cols-3 border border-[#2a3440] bg-[#0d1117]">
              <div className="border-r border-[#2a3440] p-4">
                <p className="text-2xl font-semibold text-[#8fdc8f]">{agentechFunctions.length}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Functions</p>
              </div>
              <div className="border-r border-[#2a3440] p-4">
                <p className="text-2xl font-semibold text-[#f5d06f]">1 line</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Quick Start</p>
              </div>
              <div className="p-4">
                <p className="text-2xl font-semibold text-[#93c5fd]">Dry</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Safe First</p>
              </div>
            </div>
            <div className="mt-5 grid max-w-4xl gap-3 md:grid-cols-3">
              <div className="border border-[#2a3440] bg-[#0d1117] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Install</p>
                <p className="mt-2 break-all font-mono text-xs leading-5 text-[#8fdc8f]">
                  pip install git+https://github.com/agent-tech0316/agentech_sdk.git
                </p>
              </div>
              <div className="border border-[#2a3440] bg-[#0d1117] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">One line</p>
                <p className="mt-2 font-mono text-xs leading-5 text-[#e5edf5]">Agentech.forward(speed=0.3, seconds=1)</p>
              </div>
              <div className="border border-[#2a3440] bg-[#0d1117] p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Session</p>
                <p className="mt-2 font-mono text-xs leading-5 text-[#e5edf5]">with Agentech.robot() as dog:</p>
              </div>
            </div>
          </div>
          <div className="relative min-h-72 overflow-hidden border border-[#2a3440] bg-[#06080b]">
            <Image
              src="/assets/products/aegis-ultra.png"
              alt="Aegis Ultra robot dog"
              fill
              sizes="(min-width: 1024px) 380px, 100vw"
              className="object-contain p-6"
              priority
            />
            <div className="absolute bottom-0 left-0 right-0 border-t border-[#2a3440] bg-[#0d1117]/90 px-4 py-3 backdrop-blur">
              <p className="font-mono text-xs text-[#8fdc8f]">from agentech import Agentech</p>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {showOverview ? <DocsOverview /> : null}
      {showFocusedStartCoding ? <FocusedStartCodingSection /> : null}
      {showFocusedBrowseFunctions ? <FocusedBrowseFunctionsSection /> : null}
      {showFocusedLiveRun ? <FocusedLiveRunSection /> : null}
      {showFocusedSubmitReview ? (
        <section className="bg-[#fbfdff] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="border border-[#dce7f2] bg-white shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
              <div className="border-b border-[#dce7f2] bg-[#f3f7fb] px-4 py-3">
                <p className="font-mono text-sm text-[#526174]">submission_code.py</p>
              </div>
              <textarea
                value={code}
                onChange={(event) => updateCode(event.target.value)}
                spellCheck={false}
                className="h-[520px] w-full resize-none border-0 bg-[#fbfdff] p-5 font-mono text-sm leading-7 text-[#07142e] outline-none selection:bg-[#bfe8d8]"
              />
            </div>
            <div className="border border-[#dce7f2] bg-white p-4 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">Review Package</p>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#526174]">Developer name</span>
                  <input
                    value={developerName}
                    onChange={(event) => setDeveloperName(event.target.value)}
                    className="mt-2 w-full border border-[#c9d8e8] bg-white px-3 py-2 text-sm text-[#07142e] outline-none focus:border-[#008a7a]"
                    placeholder="Student or team"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#526174]">Robot model</span>
                  <select
                    value={robotModel}
                    onChange={(event) => setRobotModel(event.target.value)}
                    className="mt-2 w-full border border-[#c9d8e8] bg-white px-3 py-2 text-sm text-[#07142e] outline-none focus:border-[#008a7a]"
                  >
                    <option>Aegis Ultra</option>
                    <option>Aegis EDU</option>
                    <option>Aegis Pro</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#526174]">Run mode</span>
                  <select
                    value={runMode}
                    onChange={(event) => setRunMode(event.target.value)}
                    className="mt-2 w-full border border-[#c9d8e8] bg-white px-3 py-2 text-sm text-[#07142e] outline-none focus:border-[#008a7a]"
                  >
                    <option>Software check</option>
                    <option>Dry-run review</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#526174]">Upload code file</span>
                  <input
                    type="file"
                    accept=".py,.txt"
                    onChange={(event) => {
                      void loadUploadedCodeFile(event.target.files?.[0] ?? null);
                    }}
                    className="mt-2 w-full border border-[#c9d8e8] bg-white px-3 py-2 text-sm text-[#23304a] outline-none file:mr-3 file:border-0 file:bg-[#e8f7f3] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#006a5c] focus:border-[#008a7a]"
                  />
                  <span className="mt-2 block text-xs leading-5 text-[#526174]">
                    {uploadedFileName ? `${uploadedFileName} loaded into the editor.` : "Upload a .py file or paste code directly into the editor."}
                  </span>
                </label>
                <div className="border border-[#dce7f2] bg-[#f8fbff] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Gate 1 - physical safety</p>
                  <p className="mt-2 font-mono text-xs leading-5 text-[#07142e]">{plan.motionCount} motion commands</p>
                  <p className="mt-1 text-xs leading-5 text-[#526174]">Checks robot limits before Supabase unlocks Software Check.</p>
                </div>
                <div className="border border-[#dce7f2] bg-[#f8fbff] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Gate 2 - Software Check</p>
                  <p className="mt-2 text-xs leading-5 text-[#23304a]">Locked until Gate 1 passes. Uses GPT-5.5 and charges account credits.</p>
                </div>
                <button
                  type="button"
                  onClick={runPhysicalSafetyCheck}
                  disabled={isRunningPhysicalCheck || isRunningSoftwareCheck}
                  className="w-full border border-[#2f70c8] bg-[#eaf3ff] px-4 py-3 text-sm font-semibold text-[#194f92] transition hover:bg-[#2f70c8] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningPhysicalCheck ? "Checking..." : "Run Physical Safety Check"}
                </button>
                <button
                  type="button"
                  onClick={runSoftwareCheck}
                  disabled={!physicalSafetyPassed || isRunningPhysicalCheck || isRunningSoftwareCheck}
                  className="w-full border border-[#008a7a] bg-[#e8f7f3] px-4 py-3 text-sm font-semibold text-[#006a5c] transition hover:bg-[#008a7a] hover:text-white disabled:cursor-not-allowed disabled:border-[#d5e0ec] disabled:bg-[#edf2f7] disabled:text-[#7d8b9c]"
                >
                  {isRunningSoftwareCheck ? "Checking..." : "Run Software Check"}
                </button>
                <div className={`border p-3 ${canScheduleRobotSlot ? "border-[#008a7a] bg-[#e8f7f3]" : "border-[#dce7f2] bg-[#f8fbff]"}`}>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Schedule gate</p>
                  <p className="mt-2 text-sm leading-6 text-[#23304a]">
                    {canScheduleRobotSlot ? "Both checks passed. You can schedule the supervised live robot test now." : "Scheduling unlocks only after physical safety and AI software security both pass."}
                  </p>
                  {canScheduleRobotSlot ? (
                    <Link
                      href="/account"
                      className="mt-3 block border border-[#008a7a] bg-[#008a7a] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#006a5c]"
                    >
                      Schedule Robot Slot
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-3 w-full cursor-not-allowed border border-[#d5e0ec] bg-[#edf2f7] px-4 py-3 text-sm font-semibold text-[#7d8b9c]"
                    >
                      Schedule Robot Slot Locked
                    </button>
                  )}
                </div>
                <p className="border border-[#dce7f2] bg-[#f8fbff] p-3 text-sm leading-6 text-[#23304a]">{requestStatus}</p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showWorkbench ? (
      <main id="code-workbench" className="mx-auto grid w-full max-w-7xl scroll-mt-6 gap-0 overflow-hidden border-x border-[#2a3440] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden border-b border-[#2a3440] bg-[#11151b] lg:block lg:border-b-0 lg:border-r">
          <div className="border-b border-[#2a3440] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8c99]">Library</p>
          </div>
          <div className="space-y-1 p-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => loadCategory(category)}
                className={`block w-full border px-3 py-2 text-left text-sm transition ${
                  activeCategory === category
                    ? "border-[#8fdc8f] bg-[#15251a] text-[#dfffe0]"
                    : "border-transparent text-[#aeb8c2] hover:border-[#2a3440] hover:bg-[#181d24] hover:text-white"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="border-t border-[#2a3440] p-3">
            {filteredFunctions.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => loadExample(item)}
                className={`mb-1 block w-full border px-3 py-2 text-left font-mono text-sm transition ${
                  activeFunction.name === item.name
                    ? "border-[#93c5fd] bg-[#101d2e] text-[#dbeafe]"
                    : "border-transparent text-[#cdd6df] hover:border-[#2a3440] hover:bg-[#181d24]"
                }`}
              >
                {item.name}()
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 bg-[#0b0d10]">
          <div className="border-b border-[#2a3440] bg-[#181d24] px-4 py-3">
            <p className="font-mono text-sm text-[#cdd6df]">agentech_quickstart.py</p>
          </div>
          <div className="border-b border-[#2a3440] bg-[#11151b] p-3 lg:hidden">
            <div className="grid gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7f8c99]">Category</span>
                <select
                  value={activeCategory}
                  onChange={(event) => loadCategory(event.target.value as Category)}
                  className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-3 text-sm text-white outline-none focus:border-[#8fdc8f]"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7f8c99]">Function</span>
                <select
                  value={activeFunction.name}
                  onChange={(event) => {
                    const selected = agentechFunctions.find((item) => item.name === event.target.value);
                    if (selected) {
                      loadExample(selected);
                    }
                  }}
                  className="mt-2 w-full border border-[#93c5fd] bg-[#101d2e] px-3 py-3 font-mono text-sm text-[#dbeafe] outline-none focus:border-[#8fdc8f]"
                >
                  {filteredFunctions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}()
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.85fr)]">
            <div>
              <textarea
                value={code}
                onChange={(event) => {
                  updateCode(event.target.value);
                }}
                spellCheck={false}
                className="h-[340px] w-full resize-none border-0 bg-[#0d1117] p-4 font-mono text-[13px] leading-6 text-[#e5edf5] outline-none selection:bg-[#275c37] sm:h-[440px] sm:text-sm sm:leading-7 lg:h-[520px] lg:p-5"
              />
              <div className="border-t border-[#2a3440] bg-[#0d1117] px-4 py-2 text-[11px] leading-5 text-[#8fdc8f] sm:px-5 sm:py-3 sm:text-xs">
                Required for motion code: <span className="font-mono">{protectedStandLine}</span>. Students can change parameters, but motion previews and submissions keep a stand command before movement.
              </div>
            </div>
            <div className="border-t border-[#2a3440] bg-[#11151b] xl:border-l xl:border-t-0">
              <div className="border-b border-[#2a3440] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8c99]">Preview</p>
                  <p className="font-mono text-xs text-[#93c5fd]">{useRealMuJoCoPreview ? "local simulator" : "official GIF"}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#8fdc8f]">
                    {previewCommandLabel(previewCommand)}
                  </p>
                  <p className="font-mono text-xs text-[#7f8c99]">{renderedFrames.length ? "real rendered frames" : "approved GIF asset"}</p>
                </div>
                <div className="relative mx-auto aspect-[4/3] max-h-[54vh] w-full overflow-hidden border border-[#2a3440] bg-black sm:aspect-[13/9]">
                  {renderedFrame ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={renderedFrame}
                      alt={`Aegis simulator render for ${previewCommandLabel(previewCommand)}`}
                      className="h-full w-full object-contain"
                    />
                  ) : previewGif ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewGif}
                      alt={`Aegis preview for ${previewCommandLabel(previewCommand)}`}
                      onError={() => {
                        setPreviewGif(localPreviewFallback);
                      }}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={localPreviewFallback}
                      alt="Aegis preview placeholder"
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="mt-4 hidden grid-cols-3 border border-[#2a3440] bg-[#0d1117] text-center font-mono text-xs sm:grid">
                  <div className="border-r border-[#2a3440] p-2">model ready</div>
                  <div className="border-r border-[#2a3440] p-2">{renderedFrames.length ? "sim" : "gif"}</div>
                  <div className="p-2">{plan.motionCount} moves</div>
                </div>
                <button
                  type="button"
                  onClick={runPreviewSimulation}
                  disabled={isSimulating}
                  className="mt-4 w-full border border-[#93c5fd] bg-[#101d2e] px-3 py-2 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f]"
                >
                  {isSimulating ? "Preparing preview..." : "Run Preview"}
                </button>
                <p className="mt-3 border border-[#2a3440] bg-[#0d1117] p-3 text-xs leading-5 text-[#aeb8c2]">{previewStatus}</p>
                <div className="mt-2 border border-[#2a3440] bg-[#0d1117] p-2 text-center font-mono text-xs text-[#7f8c99]">
                  detected command: {plan.trace[0] ?? "none"} - {useRealMuJoCoPreview || renderedFrames.length ? `frame ${Math.min(simFrameIndex + 1, previewFrameCount)} / ${previewFrameCount}` : "official clip"}
                </div>
                <div className="mt-4 max-h-32 space-y-2 overflow-auto sm:max-h-52">
                  {plan.trace.map((line, index) => (
                    <p key={`${line}-${index}`} className="border border-[#2a3440] bg-[#0d1117] px-3 py-2 font-mono text-xs text-[#cdd6df]">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {!selectedTask ? (
          <div className="border-t border-[#2a3440] p-3 lg:hidden">
            <details className="border border-[#2a3440] bg-[#11151b]">
              <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8fdc8f]">
                Function details and parameters
              </summary>
              <div className="border-t border-[#2a3440] p-3">
                <FunctionReference item={activeFunction} />
              </div>
            </details>
          </div>
          ) : null}

          {!selectedTask ? (
          <div className="hidden border-t border-[#2a3440] p-4 lg:block">
            <FunctionReference item={activeFunction} />
          </div>
          ) : null}
        </section>

        {!selectedTask ? (
        <aside className="border-t border-[#2a3440] bg-[#11151b] lg:col-start-2">
          <div className="border-b border-[#2a3440] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8c99]">Robot Session</p>
          </div>
          <div className="space-y-3 p-3 lg:hidden">
            {canScheduleRobotSlot ? (
              <Link
                href="/account"
                className="block w-full border border-[#8fdc8f] bg-[#17351f] px-4 py-3 text-center text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a]"
              >
                Schedule Live Robot Test
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed border border-[#2a3440] bg-[#151a20] px-4 py-3 text-sm font-semibold text-[#687583]"
              >
                Live Test Locked
              </button>
            )}
            <details className="border border-[#2a3440] bg-[#0d1117]">
              <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                Upload code for review
              </summary>
              <div className="space-y-3 border-t border-[#2a3440] p-3">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Developer name</span>
                  <input
                    value={developerName}
                    onChange={(event) => setDeveloperName(event.target.value)}
                    className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-3 text-sm text-white outline-none focus:border-[#8fdc8f]"
                    placeholder="Student or team"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Upload code file</span>
                  <input
                    type="file"
                    accept=".py,.txt"
                    onChange={(event) => {
                      void loadUploadedCodeFile(event.target.files?.[0] ?? null);
                    }}
                    className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-3 text-sm text-[#cdd6df] outline-none file:mr-3 file:border-0 file:bg-[#101d2e] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#dbeafe] focus:border-[#8fdc8f]"
                  />
                  <span className="mt-2 block text-xs leading-5 text-[#7f8c99]">
                    {uploadedFileName ? `${uploadedFileName} loaded.` : "Upload a .py file or paste code directly."}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={runPhysicalSafetyCheck}
                  disabled={isRunningPhysicalCheck || isRunningSoftwareCheck}
                  className="w-full border border-[#93c5fd] bg-[#101d2e] px-4 py-3 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningPhysicalCheck ? "Checking..." : "Run Physical Safety Check"}
                </button>
                <button
                  type="button"
                  onClick={runSoftwareCheck}
                  disabled={!physicalSafetyPassed || isRunningPhysicalCheck || isRunningSoftwareCheck}
                  className="w-full border border-[#8fdc8f] bg-[#102015] px-4 py-3 text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a] disabled:cursor-not-allowed disabled:border-[#2a3440] disabled:bg-[#151a20] disabled:text-[#687583]"
                >
                  {isRunningSoftwareCheck ? "Checking..." : "Run Software Check"}
                </button>
                <p className="border border-[#2a3440] bg-[#0b0d10] p-3 text-xs leading-5 text-[#aeb8c2]">{requestStatus}</p>
              </div>
            </details>

            <details className="border border-[#2a3440] bg-[#0d1117]" open>
              <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8fdc8f]">
                Live robot camera
              </summary>
              <div className="border-t border-[#2a3440] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-[#aeb8c2]">
                    {liveRobotCameraConfigured ? "Official supervised-session feed." : "LiveKit camera feed is not configured yet."}
                  </p>
                  <span className={`h-2.5 w-2.5 shrink-0 ${liveRobotCameraConfigured ? "bg-[#8fdc8f]" : "bg-[#7f8c99]"}`} aria-hidden="true" />
                </div>
                <div className="mx-auto aspect-[4/3] max-h-[420px] w-full overflow-hidden border border-[#2a3440] bg-black">
                  <LiveRobotCamera roomName={liveRobotRoomName} />
                </div>
              </div>
            </details>

            <details className="border border-[#2a3440] bg-[#0d1117]">
              <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7f8c99]">
                Safety defaults
              </summary>
              <ul className="space-y-2 border-t border-[#2a3440] p-3 text-sm leading-6 text-[#cdd6df]">
                <li>Dry-run first</li>
                <li>Forward capped at 2.37 m/s; backward capped at 2.365 m/s</li>
                <li>Lateral walking capped at 0.78 m/s</li>
                <li>Motion capped at 10 seconds</li>
                <li>Emergency stop is always available</li>
              </ul>
            </details>
          </div>

          <div className="hidden space-y-4 p-4 lg:block">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Developer name</span>
              <input
                value={developerName}
                onChange={(event) => setDeveloperName(event.target.value)}
                className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#8fdc8f]"
                placeholder="Student or team"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Robot model</span>
              <select
                value={robotModel}
                onChange={(event) => setRobotModel(event.target.value)}
                className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#8fdc8f]"
              >
                <option>Aegis Ultra</option>
                <option>Aegis EDU</option>
                <option>Aegis Pro</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Run mode</span>
              <select
                value={runMode}
                onChange={(event) => setRunMode(event.target.value)}
                className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#8fdc8f]"
              >
                <option>Software check</option>
                <option>Dry-run review</option>
              </select>
            </label>
            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Two-gate review</p>
              <p className="mt-2 font-mono text-xs leading-5 text-[#cdd6df]">{plan.motionCount} motion commands</p>
              <p className="mt-1 text-xs leading-5 text-[#7f8c99]">Physical safety must pass before Software Check uses account credits.</p>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Upload code file</span>
              <input
                type="file"
                accept=".py,.txt"
                onChange={(event) => {
                  void loadUploadedCodeFile(event.target.files?.[0] ?? null);
                }}
                className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-2 text-sm text-[#cdd6df] outline-none file:mr-3 file:border-0 file:bg-[#101d2e] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#dbeafe] focus:border-[#8fdc8f]"
              />
              <span className="mt-2 block text-xs leading-5 text-[#7f8c99]">
                {uploadedFileName ? `${uploadedFileName} loaded into the editor.` : "Upload a .py file or paste code directly into the editor."}
              </span>
            </label>
            <button
              type="button"
              onClick={runPhysicalSafetyCheck}
              disabled={isRunningPhysicalCheck || isRunningSoftwareCheck}
              className="w-full border border-[#93c5fd] bg-[#101d2e] px-4 py-3 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunningPhysicalCheck ? "Checking..." : "Run Physical Safety Check"}
            </button>
            <button
              type="button"
              onClick={runSoftwareCheck}
              disabled={!physicalSafetyPassed || isRunningPhysicalCheck || isRunningSoftwareCheck}
              className="w-full border border-[#8fdc8f] bg-[#102015] px-4 py-3 text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a] disabled:cursor-not-allowed disabled:border-[#2a3440] disabled:bg-[#151a20] disabled:text-[#687583]"
            >
              {isRunningSoftwareCheck ? "Checking..." : "Run Software Check"}
            </button>
            {canScheduleRobotSlot ? (
              <Link
                href="/account"
                className="block w-full border border-[#8fdc8f] bg-[#17351f] px-4 py-3 text-center text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a]"
              >
                Schedule Live Robot Test
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed border border-[#2a3440] bg-[#151a20] px-4 py-3 text-sm font-semibold text-[#687583]"
              >
                Live Test Locked
              </button>
            )}
            <p className="border border-[#2a3440] bg-[#0d1117] p-3 text-sm leading-6 text-[#aeb8c2]">{requestStatus}</p>

            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Live Robot Camera</p>
                  <p className="mt-1 text-xs leading-5 text-[#aeb8c2]">
                    {liveRobotCameraConfigured ? "Official supervised-session camera feed." : "LiveKit camera feed is not configured yet."}
                  </p>
                </div>
                <span className={`h-2.5 w-2.5 ${liveRobotCameraConfigured ? "bg-[#8fdc8f]" : "bg-[#7f8c99]"}`} aria-hidden="true" />
              </div>
              <div className="mx-auto mt-3 aspect-square w-full max-w-[640px] overflow-hidden border border-[#2a3440] bg-black">
                <LiveRobotCamera roomName={liveRobotRoomName} />
              </div>
            </div>

            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Safety Defaults</p>
              <ul className="mt-3 space-y-2 text-sm text-[#cdd6df]">
                <li>Dry-run first</li>
                <li>Forward capped at 2.37 m/s; backward capped at 2.365 m/s</li>
                <li>Lateral walking capped at 0.78 m/s</li>
                <li>Motion capped at 10 seconds</li>
                <li>Emergency stop is always available</li>
              </ul>
            </div>
          </div>
        </aside>
        ) : null}
      </main>
      ) : null}
      {showDocs ? <DocsSection /> : null}
    </div>
  );
}
