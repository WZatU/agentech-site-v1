"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { agentechFunctions, starterCode, type AgentechFunction } from "@/lib/agentech-library";
import { agentechLibraryTasks, getAgentechLibraryTask, type AgentechLibraryTaskSlug } from "@/lib/agentech-library-tasks";
import { eaicHubPath, getEaicHubTaskPath } from "@/lib/eaic-hub";
import { evaluateAgentechMovementSafety, type AgentechMovementSafety } from "@/lib/agentech-motion-safety";

const categories = ["All", "Movement", "Posture", "Safety", "Sensing"] as const;
type Category = (typeof categories)[number];
type SimFrame = { x: number; y: number; z: number; yaw: number; pitch?: number };
type AgentechLibraryWorkbenchProps = {
  task?: AgentechLibraryTaskSlug;
};
type HardwareChecklistItem = {
  name: string;
  status: "PASS" | "WARNING" | "FAIL";
  detail: string;
};
type HardwareSimulationClip = {
  command: string;
  label: string;
  gif: string;
  sourceLine: string;
};
type HardwareResult = {
  status: "PASS" | "WARNING" | "FAIL";
  resultId: string;
  robotModel: string;
  fileName: string;
  commandCount: number;
  checklist: HardwareChecklistItem[];
  motionPlan: string[];
  simulationClips: HardwareSimulationClip[];
  simulationError: string;
  finalHint: string;
  movementSafety: AgentechMovementSafety;
};
type ApprovedCodeFile = {
  code: string;
  downloadFileName: string;
  sourceFileName: string;
  source: "uploaded" | "editor";
  editedOnWebsite: boolean;
};
type CachedPhysicalReview = {
  id: string;
  developerName?: string;
  robotModel?: string;
  code: string;
  originalCode?: string;
  uploadedFileName?: string | null;
  downloadFileName?: string;
  editedOnWebsite?: boolean;
  physicalSafetyStatus: string;
  aiSecurityStatus: string;
};
const robotSchedulingPath = getEaicHubTaskPath("schedule-time");
const useRealMuJoCoPreview = process.env.NODE_ENV === "development";
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

function simulationClipsForMotionPlan(motionPlan: string[]): HardwareSimulationClip[] {
  const clips = motionPlan
    .map((line) => {
      const command = line.match(/^([a-zA-Z_][\w]*)\s*\(/)?.[1] ?? "";
      const gif = localPreviewAssets[command];
      if (!command || !gif) {
        return null;
      }

      return {
        command,
        label: previewCommandLabel(command),
        gif,
        sourceLine: line
      };
    })
    .filter((clip): clip is HardwareSimulationClip => Boolean(clip));

  if (clips.length) {
    return clips;
  }

  return [
    {
      command: "stand",
      label: "Stand",
      gif: localPreviewFallback,
      sourceLine: "No renderable Agentech movement command found."
    }
  ];
}

function defaultMovementSafety(status: "PASS" | "WARNING" | "FAIL", detail?: string): AgentechMovementSafety {
  return {
    level: status,
    submitReady: status === "PASS",
    maxDistanceMeters: 0,
    maxDxMeters: 0,
    maxDyMeters: 0,
    detail: detail || "Movement safety was not measured."
  };
}

function approvedDownloadFileName(fileName: string) {
  const baseName = fileName
    .replace(/^.*[\\/]/, "")
    .replace(/\.(?:py|txt)$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${baseName || "agentech_submission"}-approved.py`;
}

function buildHardwareChecklist(status: "PASS" | "WARNING" | "FAIL", failureReason = "", movementSafety = defaultMovementSafety(status, failureReason)): HardwareChecklistItem[] {
  const failDetail = failureReason || "Fix the checklist items before simulation can run.";
  const blocked = status !== "PASS";
  return [
    {
      name: "SDK-only usage check",
      status: blocked ? "FAIL" : "PASS",
      detail: !blocked ? "Uploaded code uses the documented Agentech SDK interface." : failDetail
    },
    {
      name: "Logic safety check",
      status: blocked ? "FAIL" : "PASS",
      detail: !blocked ? "No blocked file, private Python, dynamic execution, or unsafe control structure was detected." : "Hardware validation stopped before simulation."
    },
    {
      name: "Agentech command check",
      status: blocked ? "FAIL" : "PASS",
      detail: !blocked ? "Documented robot commands were found and can be inspected." : "Requires one of the 17 documented Agentech commands from the command library."
    },
    {
      name: "SDK parameter requirement check",
      status: blocked ? "FAIL" : "PASS",
      detail: !blocked ? "Movement commands use required keyword parameters and safe numeric ranges." : "Movement commands must include required keyword parameters and stay inside safe numeric ranges."
    },
    {
      name: "Movement safety box check",
      status: movementSafety.level,
      detail: movementSafety.detail
    },
    {
      name: "Real robot translation check",
      status: blocked ? "FAIL" : "PASS",
      detail: !blocked ? "Uploaded code can be treated as a real-robot command package without exposing translated code." : "Translation stays blocked until the uploaded code passes validation."
    },
    {
      name: "MuJoCo simulation check",
      status: blocked ? "FAIL" : "PASS",
      detail: !blocked ? "Approved command sequence is ready for the simulation/result view." : "Simulation blocked because validation failed or produced warning-level movement."
    }
  ];
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
  const supportedCommands = new Set([
    "forward", "backward", "lateral", "lateral_left", "lateral_right", "turn", "turn_left", "turn_right",
    "twist", "twist_left", "twist_right", "backflip", "jump", "stand", "sit", "stop", "emergency_stop",
    "look", "look_up", "look_down", "get_battery_status"
  ]);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^(?:(?:[A-Za-z_]\w*)\.)?([A-Za-z_]\w*)\s*\((.*)\)\s*;?$/);
    if (!match || !supportedCommands.has(match[1])) {
      continue;
    }

    const [, command, args] = match;
    const displayArgs = args.trim() ? `(${args.trim()})` : "()";
    trace.push(`${command}${displayArgs}`);
  }

  return {
    trace,
    motionCount: trace.filter((line) => /forward|backward|lateral_left|lateral_right|turn_left|turn_right|twist_left|twist_right|backflip|jump|look_up|look_down/.test(line)).length
  };
}

function CopyCodeButton({ value, className = "" }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className={`grid h-9 w-9 place-items-center border border-[#008a7a] bg-[#e6fbf6] text-[#007d6f] shadow-sm transition hover:bg-[#008a7a] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008a7a] focus-visible:ring-offset-2 ${className}`}
      aria-label="Copy code"
      title={copied ? "Copied" : "Copy code"}
    >
      {copied ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="8" width="11" height="11" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
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
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Review Workflow</p>
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
                The student file stays tiny. After Step 3 Physical Hardware Check, Step 4 Software Check, and scheduling, the website sends approved code to the Raspberry Pi bridge. The Pi is connected to the robot hotspot, runs the code on the robot, and the Step 5 Live Stream lets the student watch the result on the website.
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
  "physical-hardware-check": "Upload or paste one Python file, then run the physical hardware check before any software review.",
  "software-check": "Upload, paste, or type one file. Pass Hardware Safety first, then run Software Security on the exact same code.",
  "watch-live-run": "Live Stream opens only during an approved scheduled robot slot after the required checks pass."
};

function TaskDetailHeader({ task }: { task: NonNullable<ReturnType<typeof getAgentechLibraryTask>> }) {
  const isLightTask = true;

  return (
    <section className={isLightTask ? "border-b border-[#dce7f2] bg-[#fbfdff]" : "border-b border-[#2a3440] bg-[#0f1318]"}>
      <div className="mx-auto max-w-7xl px-6 py-7 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={eaicHubPath}
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
                href={getEaicHubTaskPath(item.slug)}
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#008a7a]">Live Stream Camera</p>
              <p className="mt-1 text-xs leading-5 text-[#526174]">
                Locked until an approved scheduled session is active.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={robotSchedulingPath}
                className="border border-[#008a7a] bg-[#e5fff7] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#006b5f] transition hover:bg-[#008a7a] hover:text-white"
              >
                Schedule Time
              </Link>
              <span className="h-3 w-3 bg-[#9aa8b8]" aria-hidden="true" />
            </div>
          </div>
          <div className="border-b border-[#dce7f2] bg-[#f5fbff] px-4 py-3 text-sm leading-6 text-[#23304a]">
            Live viewing is locked until your account has an active scheduled robot slot. Custom-code sessions also require Step 3 Physical Hardware Check and Step 4 Software Check to pass.
          </div>
          <LockedLiveRunPanel />
        </div>
      </div>
    </section>
  );
}

function LockedLiveRunPanel({ dark = false }: { dark?: boolean }) {
  return (
    <div className={dark ? "border border-[#2a3440] bg-[#0d1117] p-4" : "bg-white p-5"}>
      <div className={`grid min-h-64 place-items-center border ${dark ? "border-[#2a3440] bg-[#080b0f]" : "border-[#dce7f2] bg-[#f8fbff]"} px-5 py-8 text-center`}>
        <div className="max-w-xl">
          <div className={`mx-auto grid h-16 w-16 place-items-center rounded-[8px] border ${dark ? "border-[#8fdc8f] bg-[#102015] text-[#8fdc8f]" : "border-[#008a7a] bg-[#e6fbf6] text-[#007d6f]"}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.16em] ${dark ? "text-[#8fdc8f]" : "text-[#008a7a]"}`}>Live View Locked</p>
          <h3 className={`mt-2 text-2xl font-semibold ${dark ? "text-white" : "text-[#07142e]"}`}>Schedule an approved robot slot first.</h3>
          <p className={`mt-3 text-sm leading-6 ${dark ? "text-[#aeb8c2]" : "text-[#334155]"}`}>
            Live camera access only opens during an active scheduled session. For custom-code runs, pass Step 3 Physical Hardware Check and Step 4 Software Check before scheduling.
          </p>
          <Link
            href={robotSchedulingPath}
            className={`mt-5 inline-flex border px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] transition ${
              dark
                ? "border-[#8fdc8f] bg-[#17351f] text-[#dfffe0] hover:bg-[#8fdc8f] hover:text-[#08100a]"
                : "border-[#008a7a] bg-[#e5fff7] text-[#006b5f] hover:bg-[#008a7a] hover:text-white"
            }`}
          >
            Schedule Time
          </Link>
        </div>
      </div>
    </div>
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
              <div key={step.label} className="relative grid gap-4 border border-[#dce7f2] bg-white p-4 pr-16 shadow-[0_12px_30px_rgba(12,31,58,0.06)] sm:grid-cols-[72px_minmax(0,1fr)]">
                <CopyCodeButton value={step.code} className="absolute right-4 top-4 z-10" />
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
      title: "Copy into Hardware Check",
      body: "Move working sequences to Step 3 after previewing the intended behavior."
    }
  ];

  return (
    <section className="bg-[#fbfdff] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">SDK Tutorial</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#07142e]">Find a command, open details, preview the motion.</h2>
            <div className="mt-5 grid gap-px overflow-hidden border border-[#dce7f2] bg-[#dce7f2] md:grid-cols-3">
              {tutorialCards.map((card) => (
                <div key={card.title} className="bg-[#f8fbff] p-4">
                  <p className="text-sm font-semibold text-[#07142e]">{card.title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#334155]">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-[#ffd3bd] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c85016]">Safety Limits</p>
            <div className="mt-4 grid gap-2">
              {safetyLimits.map((limit) => (
                <div key={limit} className="border border-[#ffd3bd] bg-[#fff7f2] px-3 py-2 text-sm font-semibold text-[#7b2b0d]">
                  {limit}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-px overflow-hidden border border-[#dce7f2] bg-[#dce7f2] shadow-[0_12px_30px_rgba(12,31,58,0.06)] md:grid-cols-4">
          {groupedFunctions.map((group) => (
            <a key={group.category} href={`#function-${group.category.toLowerCase()}`} className="bg-white p-4 transition hover:bg-[#f3f8ff]">
              <p className="text-xs uppercase tracking-[0.14em] text-[#334155]">{group.category}</p>
              <p className="mt-2 text-3xl font-semibold text-[#07142e]">{group.items.length}</p>
              <p className="mt-1 text-xs leading-5 text-[#334155]">commands</p>
            </a>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {groupedFunctions.map((group) => (
            <details
              key={group.category}
              id={`function-${group.category.toLowerCase()}`}
              className="group/category scroll-mt-6 border border-[#dce7f2] bg-white shadow-[0_12px_30px_rgba(12,31,58,0.06)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition hover:bg-[#f8fbff] focus-visible:ring-2 focus-visible:ring-[#005bd6]/25">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#008a7a]">{group.category}</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#07142e]">{group.category} Commands</h2>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-sm text-[#005bd6]">{group.items.length} functions</span>
                  <span className="border border-[#c9d8e8] px-3 py-1 font-mono text-xs text-[#006a5c] group-open/category:hidden">View functions</span>
                  <span className="hidden border border-[#008a7a] bg-[#e8f7f3] px-3 py-1 font-mono text-xs text-[#006a5c] group-open/category:inline">Hide functions</span>
                </div>
              </summary>
              <div className="divide-y divide-[#dce7f2]">
                {group.items.map((item) => (
                  <details key={item.name} className="group bg-white">
                    <summary className="grid cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition hover:bg-[#f8fbff] focus-visible:ring-2 focus-visible:ring-[#005bd6]/25 md:grid-cols-[minmax(260px,0.8fr)_minmax(0,1fr)_auto]">
                      <p className="font-mono text-sm text-[#006a5c]">Agentech.{item.name}({item.params.length ? "parameters" : ""})</p>
                      <p className="text-sm leading-6 text-[#111d35]">{item.summary}</p>
                      <div className="flex flex-wrap items-center gap-2 justify-self-start md:justify-self-end">
                        {item.params.some((param) => param.status === "development") ? (
                          <span className="border border-[#d99a00] bg-[#fff8df] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a5b00]">Includes development items</span>
                        ) : null}
                        <span className="border border-[#c9d8e8] px-3 py-1 font-mono text-xs text-[#005bd6] group-open:border-[#008a7a] group-open:text-[#006a5c]">details</span>
                      </div>
                    </summary>
                    <div className="grid gap-px border-t border-[#dce7f2] bg-[#dce7f2] lg:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="bg-[#fbfdff] p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-[#334155]">Definition</p>
                        <p className="mt-2 font-mono text-sm text-[#006a5c]">{item.signature}</p>
                        <p className="mt-2 text-sm leading-6 text-[#111d35]">{item.summary}</p>
                        {item.profiles?.length ? (
                          <div className="mt-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs uppercase tracking-[0.14em] text-[#334155]">Parameter profiles</p>
                              <span className="border border-[#c9d8e8] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#526174]">Choose one profile only</span>
                            </div>
                            <div className="mt-2 grid gap-2">
                              {item.profiles.map((profile, profileIndex) => (
                                <div key={profile.name} className={`border p-3 ${profile.status === "development" ? "border-[#e1ad32] bg-[#fffaf0]" : "border-[#dce7f2] bg-white"}`}>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="grid h-5 w-5 place-items-center bg-[#e8f1fb] font-mono text-[10px] font-bold text-[#005bd6]">{profileIndex + 1}</span>
                                    <span className="text-xs font-semibold text-[#07142e]">{profile.name}</span>
                                    {profile.status === "development" ? <span className="border border-[#d99a00] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a5b00]">Under Development</span> : null}
                                  </div>
                                  <p className="mt-2 overflow-x-auto font-mono text-xs leading-5 text-[#006a5c]">{profile.syntax}</p>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-[#526174]">Do not combine selectors from different profiles. Optional modifiers shown inside a profile belong only to that structure.</p>
                          </div>
                        ) : null}
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#334155]">Parameters</p>
                        <div className="mt-2 grid gap-2">
                          {item.params.length ? (
                            item.params.map((param) => (
                              <div key={param.name} className={`border p-3 ${param.status === "development" ? "border-[#e1ad32] bg-[#fffaf0]" : param.status === "unsupported" ? "border-[#d88b8b] bg-[#fff5f5]" : "border-[#dce7f2] bg-white"}`}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs text-[#006a5c]">{param.name}</span>
                                  <span className="font-mono text-xs text-[#005bd6]">{param.type}</span>
                                  <span className="font-mono text-xs text-[#a35d00]">default {param.defaultValue ?? "required"}</span>
                                  {param.status === "development" ? (
                                    <span className="border border-[#d99a00] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8a5b00]">Under Development</span>
                                  ) : param.status === "unsupported" ? (
                                    <span className="border border-[#c93434] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a51f1f]">Not Supported</span>
                                  ) : (
                                    <span className="border border-[#008a7a] bg-[#e8f7f3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#006a5c]">Available</span>
                                  )}
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[#334155]">{param.description}</p>
                              </div>
                            ))
                          ) : (
                            <p className="border border-[#dce7f2] bg-white p-3 text-xs text-[#334155]">No parameters.</p>
                          )}
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.14em] text-[#334155]">Example</p>
                        <div className="relative mt-2 border border-[#dce7f2] bg-white">
                          <CopyCodeButton value={item.example} className="absolute right-2 top-2 z-10" />
                          <pre className="overflow-x-auto p-3 pr-24 pt-12 font-mono text-xs leading-6 text-[#07142e]">{item.example}</pre>
                        </div>
                      </div>
                      <div className="bg-white p-4">
                        <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-[#006a5c]">{item.name} preview</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={localPreviewAssets[item.name] ?? localPreviewFallback}
                          alt={`Aegis preview for ${previewCommandLabel(item.name)}`}
                          loading="lazy"
                          className="aspect-video w-full border border-[#dce7f2] bg-black object-contain"
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

function HardwareResultPanel({ result }: { result: HardwareResult }) {
  const passed = result.status === "PASS";
  const warning = result.status === "WARNING";
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const activeClip = result.simulationClips[Math.min(activeClipIndex, Math.max(result.simulationClips.length - 1, 0))];

  useEffect(() => {
    setActiveClipIndex(0);
  }, [result.resultId]);

  useEffect(() => {
    if (!passed || result.simulationClips.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveClipIndex((current) => (current >= result.simulationClips.length - 1 ? 0 : current + 1));
    }, 1800);

    return () => window.clearInterval(interval);
  }, [passed, result.resultId, result.simulationClips.length]);

  return (
    <section className="bg-[#fbfdff] px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">Validation Result</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#07142e]">Validation Checklist</h2>
            </div>
            <span className={`px-3 py-1.5 text-sm font-bold ${
              passed ? "bg-[#e7f7ef] text-[#087a43]" : warning ? "bg-[#fff7d6] text-[#9a6700]" : "bg-[#fdeceb] text-[#b42318]"
            }`}>
              {result.status}
            </span>
          </div>

          <div className="mt-5 overflow-hidden border border-[#dce7f2]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eef5fb] text-xs uppercase tracking-[0.14em] text-[#526174]">
                <tr>
                  <th className="px-3 py-3">Check</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dce7f2]">
                {result.checklist.map((item) => (
                  <tr key={item.name}>
                    <td className="px-3 py-3 font-semibold text-[#07142e]">{item.name}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2.5 py-1 text-xs font-bold ${
                        item.status === "PASS" ? "bg-[#e7f7ef] text-[#087a43]" : item.status === "WARNING" ? "bg-[#fff7d6] text-[#9a6700]" : "bg-[#fdeceb] text-[#b42318]"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 leading-6 text-[#334155]">{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">MuJoCo Simulation Video</p>
            <p className="mt-2 text-sm leading-6 text-[#334155]">
              The app reads the uploaded Agentech commands and shows what the code does on the selected robot.
            </p>
            {passed && activeClip ? (
              <div className="mt-4">
                <div className="border border-[#dce7f2] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={`${result.resultId}-${activeClipIndex}-${activeClip.command}`}
                    src={activeClip.gif}
                    alt={`Aegis preview for ${activeClip.label}`}
                    className="aspect-video w-full object-contain"
                  />
                </div>
                <div className="border-x border-b border-[#dce7f2] bg-[#f8fbff] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#005bd6]">
                      Playing public preview {activeClipIndex + 1} / {result.simulationClips.length}: {activeClip.label}
                    </p>
                    <p className="font-mono text-xs text-[#526174]">{activeClip.sourceLine}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {result.simulationClips.map((clip, index) => (
                      <button
                        key={`${clip.sourceLine}-${index}`}
                        type="button"
                        onClick={() => setActiveClipIndex(index)}
                        className={`border px-3 py-2 text-left font-mono text-xs transition ${
                          index === activeClipIndex
                            ? "border-[#008a7a] bg-[#e8f7f3] text-[#006a5c]"
                            : "border-[#dce7f2] bg-white text-[#334155] hover:border-[#008a7a]"
                        }`}
                      >
                        {index + 1}. {clip.sourceLine}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid min-h-72 place-items-center border border-[#f1b4ad] bg-[#fff4f2] text-center text-[#b42318]">
                <div className="p-6">
                  <div className="text-[118px] font-extrabold leading-none">X</div>
                  <p className="mt-2 text-base font-bold">Simulation blocked because validation failed.</p>
                  <p className="mt-2 text-sm leading-6 text-[#7f1d1d]">{result.simulationError}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">Selected Company Robot</p>
              <div className="mt-4 divide-y divide-[#dce7f2] border border-[#dce7f2] text-sm">
                <div className="grid grid-cols-[120px_minmax(0,1fr)]">
                  <div className="bg-[#f8fbff] px-3 py-3 font-semibold text-[#526174]">Robot</div>
                  <div className="px-3 py-3 text-[#07142e]">{result.robotModel}</div>
                </div>
                <div className="grid grid-cols-[120px_minmax(0,1fr)]">
                  <div className="bg-[#f8fbff] px-3 py-3 font-semibold text-[#526174]">Result ID</div>
                  <div className="break-all px-3 py-3 font-mono text-xs text-[#07142e]">{result.resultId}</div>
                </div>
              </div>
            </div>

            <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">Code Validation</p>
              <div className="mt-4 divide-y divide-[#dce7f2] border border-[#dce7f2] text-sm">
                <div className="grid grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="bg-[#f8fbff] px-3 py-3 font-semibold text-[#526174]">Uploaded</div>
                  <div className="min-w-0 break-words px-3 py-3 text-[#07142e] [overflow-wrap:anywhere]">{result.fileName}</div>
                </div>
                <div className="grid grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="bg-[#f8fbff] px-3 py-3 font-semibold text-[#526174]">Commands</div>
                  <div className="min-w-0 px-3 py-3 text-[#07142e]">{result.commandCount}</div>
                </div>
                <div className="grid grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="bg-[#f8fbff] px-3 py-3 font-semibold text-[#526174]">SDK Rule</div>
                  <div className="min-w-0 break-words px-3 py-3 text-[#07142e]">Only Agentech SDK is allowed.</div>
                </div>
                <div className="grid grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="bg-[#f8fbff] px-3 py-3 font-semibold text-[#526174]">Move Box</div>
                  <div className="min-w-0 break-words px-3 py-3 text-[#07142e] [overflow-wrap:anywhere]">
                    {result.movementSafety.level}: max {result.movementSafety.maxDistanceMeters.toFixed(3)}m, dx {result.movementSafety.maxDxMeters.toFixed(3)}m, dy {result.movementSafety.maxDyMeters.toFixed(3)}m
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">Agentech Movement List</p>
            <div className="mt-4 overflow-hidden border border-[#dce7f2]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#eef5fb] text-xs uppercase tracking-[0.14em] text-[#526174]">
                  <tr>
                    <th className="px-3 py-3">#</th>
                    <th className="px-3 py-3">Command</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dce7f2]">
                  {result.motionPlan.map((line, index) => (
                    <tr key={`${line}-${index}`}>
                      <td className="w-16 px-3 py-3 font-mono text-xs text-[#526174]">{index + 1}</td>
                      <td className="px-3 py-3 font-mono text-xs text-[#07142e]">{line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">Final Status</p>
            <p className="mt-4">
              <span className={`px-3 py-1.5 text-sm font-bold ${
                passed ? "bg-[#e7f7ef] text-[#087a43]" : warning ? "bg-[#fff7d6] text-[#9a6700]" : "bg-[#fdeceb] text-[#b42318]"
              }`}>
                {result.status}
              </span>
            </p>
            <p className="mt-4 text-sm leading-6 text-[#334155]">{result.finalHint}</p>
            {passed ? (
              <button
                type="button"
                className="mt-4 w-full border border-[#008a7a] bg-[#008a7a] px-4 py-3 text-sm font-semibold text-white"
              >
                Submit for Further Review
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed border border-[#d5e0ec] bg-[#edf2f7] px-4 py-3 text-sm font-semibold text-[#7d8b9c]"
              >
                Submit for Further Review
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AgentechLibraryWorkbench({ task }: AgentechLibraryWorkbenchProps = {}) {
  const [code, setCode] = useState(() => (task ? "from agentech import Agentech\n\n" : starterCode));
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeName, setActiveName] = useState("stand");
  const [requestStatus, setRequestStatus] = useState("Ready for Code Certification. Run Hardware Safety first; Software Security unlocks after it passes.");
  const [reviewInputError, setReviewInputError] = useState("");
  const [isDraggingCodeFile, setIsDraggingCodeFile] = useState(false);
  const developerName = "Agentech developer";
  const robotModel = "Aegies";
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedOriginalCode, setUploadedOriginalCode] = useState("");
  const [approvedCodeFile, setApprovedCodeFile] = useState<ApprovedCodeFile | null>(null);
  const [physicalSubmissionId, setPhysicalSubmissionId] = useState("");
  const [physicalSafetyPassed, setPhysicalSafetyPassed] = useState(false);
  const [isRunningPhysicalCheck, setIsRunningPhysicalCheck] = useState(false);
  const [isRunningSoftwareCheck, setIsRunningSoftwareCheck] = useState(false);
  const [isLoadingReviewGate, setIsLoadingReviewGate] = useState(task === "software-check");
  const [isInternalCompanyAccount, setIsInternalCompanyAccount] = useState(false);
  const [canScheduleRobotSlot, setCanScheduleRobotSlot] = useState(false);
  const [softwareReviewStatus, setSoftwareReviewStatus] = useState<"locked" | "pending" | "passed" | "failed" | "error">("locked");
  const [submissionQuery, setSubmissionQuery] = useState({ ready: false, id: "" });
  const [hardwareResult, setHardwareResult] = useState<HardwareResult | null>(null);
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
  const runMode = selectedTask?.slug === "software-check" ? "Code certification" : "Physical hardware limit and capability test";
  const runModeDescription =
    selectedTask?.slug === "software-check"
      ? "Run Hardware Safety first. After it passes, click Run Software Security to scan the exact same file."
      : "Step 3 checks physical limits, robot capability, command duration, speed, angle, and risky movements.";
  const showHero = !selectedTask;
  const showOverview = !selectedTask;
  const showWorkbench = !selectedTask;
  const showFocusedReview = selectedTask?.slug === "software-check";
  const focusedReviewStep = selectedTask?.slug === "software-check" ? "Step 3 - Code Certification" : "Step 3 - Physical Hardware Check";
  const focusedReviewCopy =
    selectedTask?.slug === "software-check"
      ? "Complete Hardware Safety first, then run Software Security. Passing both unlocks a robot time-slot request."
      : "Physical Hardware Check runs first. It protects the robot body by checking command limits, motion duration, model compatibility, and risky movements.";
  const hardwarePassed = physicalSafetyPassed && hardwareResult?.status === "PASS";
  const hardwareWarning = hardwareResult?.status === "WARNING";
  const hardwareFailed = hardwareResult?.status === "FAIL";
  const softwarePassed = canScheduleRobotSlot;
  const softwareFailed = softwareReviewStatus === "failed" || softwareReviewStatus === "error";
  const step3PanelClass = hardwarePassed
    ? "border-[#008a7a] bg-[#e8f7f3]"
    : hardwareWarning
      ? "border-[#d99a00] bg-[#fff8df]"
    : hardwareFailed
      ? "border-[#c93434] bg-[#fff1f1]"
      : "border-[#dce7f2] bg-[#f8fbff]";
  const step4PanelClass = softwarePassed
    ? "border-[#008a7a] bg-[#e8f7f3]"
    : softwareFailed
      ? "border-[#c93434] bg-[#fff1f1]"
    : hardwarePassed
      ? "border-[#008a7a] bg-white"
      : "border-[#dce7f2] bg-[#f8fbff]";
  const showFocusedStartCoding = selectedTask?.slug === "start-coding";
  const showFocusedBrowseFunctions = selectedTask?.slug === "view-sdk";
  const showFocusedLiveRun = selectedTask?.slug === "watch-live-run";
  const showDocs = !selectedTask;
  const useLightTaskPage = Boolean(selectedTask);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("submissionId")?.trim() ?? "";
    setSubmissionQuery({ ready: true, id });
  }, []);

  useEffect(() => {
    if (!showFocusedReview) {
      setIsLoadingReviewGate(false);
      return;
    }

    if (!submissionQuery.ready) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadLatestReviewGate() {
      setIsLoadingReviewGate(selectedTask?.slug === "software-check" || Boolean(submissionQuery.id));
      try {
        const endpoint = submissionQuery.id
          ? `/api/agentech-code-submit?submissionId=${encodeURIComponent(submissionQuery.id)}`
          : "/api/agentech-code-submit";
        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal
        });
        const payload = (await response.json().catch(() => ({ error: "The saved review result could not be read." }))) as {
          error?: string;
          internalAccount?: boolean;
          localPreview?: boolean;
          latestSubmission?: {
            id: string;
            developerName?: string;
            robotModel?: string;
            code: string;
            uploadedFileName?: string | null;
            physicalSafetyStatus: string;
            aiSecurityStatus: string;
          } | null;
        };

        if (!active) {
          return;
        }

        setIsInternalCompanyAccount(payload.internalAccount === true);
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load the latest Physical Hardware Check.");
        }

        let cachedSubmission: CachedPhysicalReview | null = null;
        try {
          cachedSubmission = JSON.parse(window.sessionStorage.getItem("agentech-latest-physical-review") ?? "null");
        } catch {
          cachedSubmission = null;
        }

        let latestSubmission = payload.latestSubmission ?? null;
        if (!latestSubmission && payload.localPreview) {
          latestSubmission = cachedSubmission;
        }

        if (!latestSubmission || latestSubmission.physicalSafetyStatus !== "passed") {
          setRequestStatus("Run and pass Step 3 Physical Hardware Check before starting Step 4 Software Check.");
          return;
        }

        const restoredCode = ensureRequiredStand(latestSubmission.code);
        const restoredPlan = commandPlan(restoredCode);
        const movementSafety = evaluateAgentechMovementSafety(restoredCode);
        setCode(restoredCode);
        setUploadedFileName(latestSubmission.uploadedFileName ?? "");
        const cachedSubmissionMatches = cachedSubmission?.id === latestSubmission.id;
        const cachedReview = cachedSubmissionMatches ? cachedSubmission : null;
        const restoredSourceFileName = latestSubmission.uploadedFileName || "website-editor.py";
        setUploadedOriginalCode(
          cachedReview && typeof cachedReview.originalCode === "string"
            ? cachedReview.originalCode
            : restoredCode
        );
        setApprovedCodeFile({
          code: restoredCode,
          downloadFileName:
            cachedReview?.downloadFileName
              ? cachedReview.downloadFileName
              : approvedDownloadFileName(restoredSourceFileName),
          sourceFileName: restoredSourceFileName,
          source: latestSubmission.uploadedFileName ? "uploaded" : "editor",
          editedOnWebsite: cachedReview?.editedOnWebsite === true
        });
        setPhysicalSubmissionId(latestSubmission.id);
        setPhysicalSafetyPassed(true);
        setSoftwareReviewStatus(latestSubmission.aiSecurityStatus as "locked" | "pending" | "passed" | "failed" | "error");
        setCanScheduleRobotSlot(latestSubmission.aiSecurityStatus === "passed");
        setHardwareResult({
          status: "PASS",
          resultId: latestSubmission.id,
          robotModel: latestSubmission.robotModel || robotModel,
          fileName: latestSubmission.uploadedFileName || "pasted code",
          commandCount: restoredPlan.trace.length,
          checklist: buildHardwareChecklist("PASS", "", movementSafety),
          motionPlan: restoredPlan.trace,
          simulationClips: simulationClipsForMotionPlan(restoredPlan.trace),
          simulationError: "",
          finalHint: "The saved Physical Hardware Check passed. This submission is ready for Software Check.",
          movementSafety
        });
        setRequestStatus(
          latestSubmission.aiSecurityStatus === "passed"
            ? `Step 4 Software Check already passed for review ${latestSubmission.id}. Step 5 Live Stream scheduling is unlocked.`
            : latestSubmission.aiSecurityStatus === "locked"
              ? `Saved Step 3 Physical Hardware Check restored. Step 4 Software Check is unlocked. Review ID: ${latestSubmission.id}.`
              : `Saved submission restored. Its one Software Check has status: ${latestSubmission.aiSecurityStatus}. Review ID: ${latestSubmission.id}.`
        );
      } catch (error) {
        if (!active || (error instanceof Error && error.name === "AbortError")) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unable to load the latest Physical Hardware Check.";
        setReviewInputError(message);
        setRequestStatus(message);
      } finally {
        if (active) {
          setIsLoadingReviewGate(false);
        }
      }
    }

    void loadLatestReviewGate();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedTask?.slug, showFocusedReview, submissionQuery]);

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
    if (commandPlan(normalizedCode).trace.length) {
      setReviewInputError("");
    }
    setPhysicalSubmissionId("");
    setPhysicalSafetyPassed(false);
    setSoftwareReviewStatus("locked");
    setCanScheduleRobotSlot(false);
    setHardwareResult(null);
    setApprovedCodeFile(null);
    window.sessionStorage.removeItem("agentech-latest-physical-review");
    resetPreview(normalizedCode, preferredCommand);
  }

  async function loadUploadedCodeFile(file: File | null) {
    if (softwarePassed) {
      return;
    }
    if (!file) {
      return;
    }

    if (!/\.(?:py|txt)$/i.test(file.name)) {
      const message = "Choose a Python (.py) or text (.txt) code file.";
      setReviewInputError(message);
      setRequestStatus(message);
      return;
    }

    const text = await file.text();
    setUploadedFileName(file.name);
    setUploadedOriginalCode(text);
    updateCode(text);
    if (!text.trim()) {
      const message = `${file.name} is empty. Add at least one Agentech command before running the check.`;
      setReviewInputError(message);
      setRequestStatus(message);
      return;
    }

    setReviewInputError("");
    setRequestStatus(`${file.name} loaded. Run Step 3 Physical Hardware Check first.`);
  }

  function handleCodeFileDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDraggingCodeFile(false);
    void loadUploadedCodeFile(event.dataTransfer.files?.[0] ?? null);
  }

  function downloadApprovedCodeFile() {
    if (!approvedCodeFile) {
      return;
    }

    const contents = approvedCodeFile.code.endsWith("\n") ? approvedCodeFile.code : `${approvedCodeFile.code}\n`;
    const url = URL.createObjectURL(new Blob([contents], { type: "text/x-python;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = approvedCodeFile.downloadFileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
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

  async function runPhysicalSafetyCheck(continueToSoftware = false) {
    const reviewCode = ensureRequiredStand(code);
    if (reviewCode !== code) {
      setCode(reviewCode);
    }
    const reviewPlan = commandPlan(reviewCode);
    if (!reviewCode.trim() || !reviewPlan.trace.length) {
      const message = "Type or paste code containing at least one supported Agentech command, or upload a .py file.";
      setPhysicalSubmissionId("");
      setPhysicalSafetyPassed(false);
      setSoftwareReviewStatus("locked");
      setCanScheduleRobotSlot(false);
      setHardwareResult(null);
      setReviewInputError(message);
      setRequestStatus(message);
      return;
    }

    const movementSafety = evaluateAgentechMovementSafety(reviewCode);
    setReviewInputError("");
    setIsRunningPhysicalCheck(true);
    setPhysicalSubmissionId("");
    setPhysicalSafetyPassed(false);
    setSoftwareReviewStatus("locked");
    setCanScheduleRobotSlot(false);
    setHardwareResult(null);
    setApprovedCodeFile(null);
    setRequestStatus("Running Step 3 Physical Hardware Check...");
    try {
      if (!movementSafety.submitReady) {
        setHardwareResult({
          status: movementSafety.level,
          resultId: `blocked-${Date.now()}`,
          robotModel,
          fileName: uploadedFileName || "pasted code",
          commandCount: reviewPlan.motionCount,
          checklist: buildHardwareChecklist(movementSafety.level, movementSafety.detail, movementSafety),
          motionPlan: reviewPlan.trace,
          simulationClips: [],
          simulationError: movementSafety.detail,
          finalHint: movementSafety.level === "WARNING" ? "Warning-level movement is not submit-ready. Keep max movement within 0.8m before Step 4 unlocks." : "Submission is locked until movement stays inside the physical test box limits.",
          movementSafety
        });
        setRequestStatus(movementSafety.detail);
        return;
      }

      const response = await fetch("/api/agentech-code-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStage: "physical",
          developerName,
          robotModel,
          runMode: "Physical hardware limit and capability test",
          code: reviewCode,
          uploadedFileName,
          commands: reviewPlan.trace
        })
      });
      const payload = await response.json().catch(() => ({
        error: "The review service returned an unreadable response. Please retry.",
        errorCode: "REVIEW_SERVICE_ERROR"
      }));
      if (!response.ok) {
        const message = payload.error ?? "Physical Hardware Check failed.";
        const requestErrorCodes = new Set(["AUTH_REQUIRED", "CODE_REQUIRED", "ACCOUNT_NOT_FOUND", "REVIEW_SERVICE_ERROR"]);
        if (requestErrorCodes.has(payload.errorCode) || response.status >= 500) {
          setHardwareResult(null);
          setReviewInputError(message);
          setRequestStatus(message);
          return;
        }

        const responseMovementSafety = payload.movementSafety as AgentechMovementSafety | undefined;
        const blockedSafety = responseMovementSafety ?? defaultMovementSafety("FAIL", "Movement safety was not evaluated because code validation failed.");
        setHardwareResult({
          status: blockedSafety.level,
          resultId: `blocked-${Date.now()}`,
          robotModel,
          fileName: uploadedFileName || "pasted code",
          commandCount: reviewPlan.motionCount,
          checklist: buildHardwareChecklist(blockedSafety.level, message, blockedSafety),
          motionPlan: reviewPlan.trace,
          simulationClips: [],
          simulationError: message,
          finalHint: blockedSafety.level === "WARNING" ? "Warning-level movement is not submit-ready. Keep max movement within 0.8m before Step 4 unlocks." : "Submission is locked until every checklist item passes.",
          movementSafety: blockedSafety
        });
        setRequestStatus(message);
        return;
      }
      const sourceFileName = uploadedFileName || "website-editor.py";
      const approvedFile: ApprovedCodeFile = {
        code: reviewCode,
        downloadFileName: approvedDownloadFileName(sourceFileName),
        sourceFileName,
        source: uploadedFileName ? "uploaded" : "editor",
        editedOnWebsite: uploadedFileName ? reviewCode !== uploadedOriginalCode : true
      };
      setPhysicalSubmissionId(payload.id);
      setPhysicalSafetyPassed(true);
      setSoftwareReviewStatus("locked");
      setIsInternalCompanyAccount(payload.internalAccount === true);
      setApprovedCodeFile(approvedFile);
      setReviewInputError("");
      setHardwareResult({
        status: "PASS",
        resultId: payload.id ?? "local-hardware-result",
        robotModel,
        fileName: uploadedFileName || "pasted code",
        commandCount: Number(payload.commandCount ?? reviewPlan.trace.length),
        checklist: buildHardwareChecklist("PASS", "", movementSafety),
        movementSafety,
        motionPlan: reviewPlan.trace,
        simulationClips: simulationClipsForMotionPlan(reviewPlan.trace),
        simulationError: "",
        finalHint: "All checks passed. This result is ready to submit for further review."
      });
      window.sessionStorage.setItem("agentech-latest-physical-review", JSON.stringify({
        id: payload.id,
        developerName,
        robotModel,
        code: reviewCode,
        originalCode: uploadedOriginalCode,
        uploadedFileName: uploadedFileName || null,
        downloadFileName: approvedFile.downloadFileName,
        editedOnWebsite: approvedFile.editedOnWebsite,
        physicalSafetyStatus: "passed",
        aiSecurityStatus: "locked"
      }));
      setRequestStatus(
        continueToSoftware
          ? `Hardware safety passed for ${payload.commandCount} commands. Starting software security review...`
          : `Hardware safety passed for ${payload.commandCount} commands. You can now run Software Security.`
      );
      if (continueToSoftware) {
        await runSoftwareCheck({ submissionId: payload.id, approvedFile, reviewCode });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Physical Hardware Check failed.";
      setPhysicalSubmissionId("");
      setPhysicalSafetyPassed(false);
      setCanScheduleRobotSlot(false);
      setHardwareResult(null);
      setReviewInputError(message);
      setRequestStatus(message);
    } finally {
      setIsRunningPhysicalCheck(false);
    }
  }

  async function runSoftwareCheck(overrides?: { submissionId: string; approvedFile: ApprovedCodeFile; reviewCode: string }) {
    const submissionId = overrides?.submissionId ?? physicalSubmissionId;
    if (!submissionId || (!physicalSafetyPassed && !overrides)) {
      setRequestStatus("Run and pass Step 3 Physical Hardware Check before starting Step 4 Software Check.");
      return;
    }

    if (softwareReviewStatus !== "locked") {
      setRequestStatus("Software Check can only run once for each submission. Save a new hardware-passed submission to run another check.");
      return;
    }

    const reviewCode = overrides?.reviewCode ?? approvedCodeFile?.code ?? ensureRequiredStand(code);
    const reviewFileName = overrides?.approvedFile.sourceFileName ?? approvedCodeFile?.sourceFileName ?? uploadedFileName;
    const reviewPlan = commandPlan(reviewCode);
    setIsRunningSoftwareCheck(true);
    setSoftwareReviewStatus("pending");
    setCanScheduleRobotSlot(false);
    setRequestStatus("Running Software Check with OpenAI...");
    try {
      const response = await fetch("/api/agentech-code-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStage: "software",
          submissionId,
          developerName,
          robotModel,
          runMode: "Software check",
          code: reviewCode,
          uploadedFileName: reviewFileName,
          commands: reviewPlan.trace
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        setSoftwareReviewStatus(payload.aiSecurityStatus === "locked" ? "locked" : payload.aiSecurityStatus || "error");
        const findings = Array.isArray(payload.findings) && payload.findings.length
          ? ` Findings: ${payload.findings.slice(0, 3).join(" ")}`
          : "";
        throw new Error(`${payload.error ?? "Software Check failed."}${findings}`);
      }
      setIsInternalCompanyAccount(payload.internalAccount === true);
      const creditMessage = payload.internalAccount
        ? payload.creditsCharged > 0
          ? `${payload.creditsCharged} company account credit${payload.creditsCharged === 1 ? "" : "s"} used; internal access remains available for testing.`
          : "No company credits were available, so the internal test continued without a charge."
        : payload.creditsBypassed
          ? "No credits charged in local preview."
          : `${payload.creditsCharged} account credit${payload.creditsCharged === 1 ? "" : "s"} used.`;
      setRequestStatus(`Code Certification passed. ${creditMessage} You can now request a robot time slot.`);
      setSoftwareReviewStatus("passed");
      setCanScheduleRobotSlot(payload.aiSecurityStatus === "passed");
    } catch (error) {
      setCanScheduleRobotSlot(false);
      setSoftwareReviewStatus((current) => current === "pending" ? "error" : current);
      setRequestStatus(error instanceof Error ? error.message : "Software Check failed.");
    } finally {
      setIsRunningSoftwareCheck(false);
    }
  }

  return (
    <div className={`agentech-library-page min-h-screen ${useLightTaskPage ? "bg-[#fbfdff] text-[#07142e]" : "bg-[#0b0d10] text-white"}`}>
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
              EAIC HUB
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
              alt="Aegis EDU robot dog"
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
      {showFocusedReview ? (
        <section className="bg-[#fbfdff] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex h-full flex-col border border-[#dce7f2] bg-white shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
              <div className="border-b border-[#dce7f2] bg-[#f3f7fb] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-semibold text-[#23304a]">submission_code.py</p>
                  <span className="border border-[#008a7a] bg-[#e8f7f3] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#006a5c]">
                    Type or paste here
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#526174]">
                  You do not need to upload a file. Type or paste your Python code below, then run Code Certification.
                </p>
              </div>
              <textarea
                aria-label="Python code submission editor"
                placeholder="Type or paste your Agentech Python code here..."
                value={code}
                onChange={(event) => updateCode(event.target.value)}
                disabled={softwarePassed}
                spellCheck={false}
                className="min-h-[520px] w-full flex-1 resize-none border-0 bg-[#fbfdff] p-5 font-mono text-sm leading-7 text-[#07142e] outline-none selection:bg-[#bfe8d8] disabled:cursor-not-allowed disabled:bg-[#f1f7f5] disabled:text-[#526174] lg:min-h-[760px]"
              />
            </div>
            <div className="border border-[#dce7f2] bg-white p-4 shadow-[0_18px_42px_rgba(12,31,58,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#005bd6]">{focusedReviewStep}</p>
              <p className="mt-2 text-xs leading-5 text-[#526174]">{focusedReviewCopy}</p>
              <div className="mt-4 space-y-4">
                <div className="border border-[#c9d8e8] bg-[#f8fbff] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Robot model</p>
                  <p className="mt-2 text-sm font-semibold text-[#07142e]">{robotModel}</p>
                  <p className="mt-1 text-xs leading-5 text-[#526174]">Aegies is the enabled robot model for this hardware check.</p>
                </div>
                <div className="border border-[#c9d8e8] bg-[#f8fbff] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Test type</p>
                  <p className="mt-2 text-sm font-semibold text-[#07142e]">{runMode}</p>
                  <p className="mt-1 text-xs leading-5 text-[#526174]">{runModeDescription}</p>
                </div>
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-[#dce7f2]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8b9c]">Or upload a file</span>
                  <span className="h-px flex-1 bg-[#dce7f2]" />
                </div>
                <label
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDraggingCodeFile(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                    setIsDraggingCodeFile(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setIsDraggingCodeFile(false);
                    }
                  }}
                  onDrop={handleCodeFileDrop}
                  className={`block border border-dashed p-3 transition ${
                    isDraggingCodeFile
                      ? "border-[#008a7a] bg-[#e8f7f3]"
                      : reviewInputError
                        ? "border-[#c93434] bg-[#fff8f8]"
                        : "border-[#c9d8e8] bg-[#f8fbff] hover:border-[#008a7a]"
                  }`}
                >
                  <span className="text-xs uppercase tracking-[0.14em] text-[#526174]">Upload code file</span>
                  <span className="mt-2 block text-sm font-semibold text-[#07142e]">
                    {isDraggingCodeFile ? "Drop the file here" : "Drag a .py or .txt file here, or choose a file"}
                  </span>
                  <input
                    type="file"
                    accept=".py,.txt"
                    disabled={softwarePassed}
                    onChange={(event) => {
                      void loadUploadedCodeFile(event.target.files?.[0] ?? null);
                    }}
                    className="mt-3 w-full border border-[#c9d8e8] bg-white px-3 py-2 text-sm text-[#23304a] outline-none file:mr-3 file:border-0 file:bg-[#e8f7f3] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#006a5c] focus:border-[#008a7a]"
                  />
                  <span className="mt-2 block text-xs leading-5 text-[#526174]">
                    {uploadedFileName ? `${uploadedFileName} loaded into the editor.` : "Upload a .py file or paste code directly into the editor."}
                  </span>
                </label>
                {reviewInputError ? (
                  <div role="alert" className="border border-[#c93434] bg-[#fff1f1] px-3 py-2 text-xs leading-5 text-[#a51f1f]">
                    {reviewInputError}
                  </div>
                ) : null}
                <div className={`border p-3 ${step3PanelClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Stage 1 - Hardware Safety</p>
                    {hardwarePassed ? (
                      <span className="inline-flex items-center gap-1 border border-[#008a7a] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#006a5c]">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[2.5]">
                          <path d="M3.5 8.2 6.7 11.2 12.8 4.8" />
                        </svg>
                        Passed
                      </span>
                    ) : null}
                    {hardwareFailed ? (
                      <span className="border border-[#c93434] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a51f1f]">
                        Failed
                      </span>
                    ) : null}
                    {hardwareWarning ? (
                      <span className="border border-[#d99a00] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a6700]">
                        Warning
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 font-mono text-xs leading-5 text-[#07142e]">{plan.motionCount} motion commands</p>
                  <p
                    className={`mt-1 text-xs leading-5 ${
                      hardwareFailed ? "text-[#a51f1f]" : hardwareWarning ? "text-[#9a6700]" : "text-[#526174]"
                    }`}
                  >
                    {hardwarePassed
                      ? "Hardware and parameter limits passed. Software security is running next."
                      : hardwareWarning
                        ? requestStatus
                        : hardwareFailed
                          ? requestStatus
                          : "Checks robot commands, parameters, motion limits, and robot-body safety first."}
                  </p>
                  {hardwarePassed && approvedCodeFile ? (
                    <div className="mt-3 border-t border-[#008a7a]/30 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#006a5c]">Approved code file</p>
                      <p className="mt-2 break-all font-mono text-xs text-[#07142e]">{approvedCodeFile.downloadFileName}</p>
                      <p className="mt-1 text-xs leading-5 text-[#526174]">
                        {approvedCodeFile.editedOnWebsite
                          ? "This is the version edited in the website editor and passed Step 3."
                          : "This is the exact uploaded version that passed Step 3."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[#526174]">Review ID: {physicalSubmissionId}</p>
                        <button
                          type="button"
                          onClick={downloadApprovedCodeFile}
                          aria-label="Download approved code file"
                          title="Download approved code file"
                          className="inline-flex items-center justify-center border border-[#008a7a] bg-white p-2 text-[#006a5c] transition hover:bg-[#e8f7f3]"
                        >
                          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                            <path d="M8 2.5v7M5.2 7.4 8 10.2l2.8-2.8M3 12.5h10" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={`border p-3 ${step4PanelClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Stage 2 - Software Security</p>
                    {isLoadingReviewGate ? (
                      <span className="border border-[#93c5fd] bg-[#eaf3ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#194f92]">
                        Checking
                      </span>
                    ) : softwarePassed ? (
                      <span className="inline-flex items-center gap-1 border border-[#008a7a] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#006a5c]">
                        <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3 w-3 fill-none stroke-current stroke-[2.5]">
                          <path d="M3.5 8.2 6.7 11.2 12.8 4.8" />
                        </svg>
                        Passed
                      </span>
                    ) : softwareFailed ? (
                      <span className="border border-[#c93434] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a51f1f]">
                        Failed
                      </span>
                    ) : hardwarePassed ? (
                      <span className="border border-[#008a7a] bg-[#e8f7f3] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#006a5c]">
                        Next
                      </span>
                    ) : (
                      <span className="border border-[#d5e0ec] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d8b9c]">
                        Locked
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#23304a]">
                    {isLoadingReviewGate
                      ? "Checking the latest saved Physical Hardware Check for this account."
                      : softwarePassed
                      ? "Software security passed. Time-slot requests are unlocked."
                      : hardwarePassed && softwareReviewStatus !== "locked"
                        ? softwareReviewStatus === "failed" || softwareReviewStatus === "error"
                          ? "Software Security did not pass. Review the findings below."
                          : `Software security status: ${softwareReviewStatus}.`
                      : hardwarePassed
                        ? isInternalCompanyAccount
                          ? "Unlocked. Company credits can be charged, but credit balance does not block internal testing."
                          : "Hardware passed. Click Run Software Security to complete certification."
                        : isInternalCompanyAccount
                          ? "Locked until Step 3 passes. Company credit balance does not block internal testing."
                          : "Locked until Step 3 passes. Uses GPT-5.5 and charges account credits."}
                  </p>
                  {softwareFailed ? (
                    <div role="alert" className="mt-3 border-t border-[#c93434]/30 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a51f1f]">Why it did not pass</p>
                      <p className="mt-2 text-xs leading-5 text-[#8f1f1f]">{requestStatus}</p>
                      <p className="mt-2 text-xs leading-5 text-[#526174]">
                        Correct the reported security issue, then run Hardware Safety again before starting a new Software Security check.
                      </p>
                    </div>
                  ) : null}
                </div>
                {!softwarePassed ? <button
                  type="button"
                  onClick={() => void runPhysicalSafetyCheck()}
                  disabled={isLoadingReviewGate || isRunningPhysicalCheck || isRunningSoftwareCheck}
                  className="w-full border border-[#2f70c8] bg-[#eaf3ff] px-4 py-3 text-sm font-semibold text-[#194f92] transition hover:bg-[#2f70c8] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningPhysicalCheck
                    ? "Running Hardware Safety..."
                    : hardwarePassed || hardwareFailed || hardwareWarning
                      ? "Run Hardware Safety Again"
                      : "Run Hardware Safety"}
                </button> : null}
                {!softwarePassed ? <button
                  type="button"
                  onClick={() => void runSoftwareCheck()}
                  disabled={isLoadingReviewGate || !hardwarePassed || isRunningPhysicalCheck || isRunningSoftwareCheck || softwareReviewStatus !== "locked"}
                  className={`w-full border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-[#d5e0ec] disabled:bg-[#edf2f7] disabled:text-[#7d8b9c] ${
                    hardwarePassed && softwareReviewStatus === "locked"
                      ? "border-[#008a7a] bg-[#008a7a] text-white hover:bg-[#006a5c]"
                      : "border-[#008a7a] bg-[#e8f7f3] text-[#006a5c]"
                  }`}
                >
                  {isRunningSoftwareCheck
                    ? "Running Software Security..."
                    : softwarePassed
                      ? "Software Security Passed"
                      : softwareReviewStatus === "locked"
                        ? "Run Software Security"
                        : "Software Security Used"}
                </button> : null}
                <div className={`border p-3 ${canScheduleRobotSlot ? "border-[#008a7a] bg-[#e8f7f3]" : "border-[#dce7f2] bg-[#f8fbff]"}`}>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#526174]">Schedule gate</p>
                  <p className="mt-2 text-sm leading-6 text-[#23304a]">
                    {canScheduleRobotSlot ? "Hardware safety and software security passed. You can request a supervised robot time slot now." : "Time-slot requests unlock only after both certification stages pass."}
                  </p>
                  {canScheduleRobotSlot ? (
                    <Link
                      href={robotSchedulingPath}
                      className="mt-3 block border border-[#008a7a] bg-[#008a7a] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#006a5c]"
                    >
                      Request Time Slot
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-3 w-full cursor-not-allowed border border-[#d5e0ec] bg-[#edf2f7] px-4 py-3 text-sm font-semibold text-[#7d8b9c]"
                    >
                      Request Time Slot Locked
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {showFocusedReview && hardwareResult ? <HardwareResultPanel result={hardwareResult} /> : null}

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
                href={robotSchedulingPath}
                className="block w-full border border-[#8fdc8f] bg-[#17351f] px-4 py-3 text-center text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a]"
              >
                Schedule Live Stream
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed border border-[#2a3440] bg-[#151a20] px-4 py-3 text-sm font-semibold text-[#687583]"
              >
                Live Stream Locked
              </button>
            )}
            <details className="border border-[#2a3440] bg-[#0d1117]">
              <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#93c5fd]">
                Upload code for review
              </summary>
              <div className="space-y-3 border-t border-[#2a3440] p-3">
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
                  onClick={() => void runPhysicalSafetyCheck()}
                  disabled={isLoadingReviewGate || isRunningPhysicalCheck || isRunningSoftwareCheck}
                  className="w-full border border-[#93c5fd] bg-[#101d2e] px-4 py-3 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningPhysicalCheck ? "Checking..." : "Run Physical Hardware Check"}
                </button>
                <button
                  type="button"
                  onClick={() => void runSoftwareCheck()}
                  disabled={isLoadingReviewGate || !physicalSafetyPassed || isRunningPhysicalCheck || isRunningSoftwareCheck || softwareReviewStatus !== "locked"}
                  className="w-full border border-[#8fdc8f] bg-[#102015] px-4 py-3 text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a] disabled:cursor-not-allowed disabled:border-[#2a3440] disabled:bg-[#151a20] disabled:text-[#687583]"
                >
                  {isRunningSoftwareCheck ? "Checking..." : softwareReviewStatus === "locked" ? "Run Software Check" : "Software Check Used"}
                </button>
                <p className="border border-[#2a3440] bg-[#0b0d10] p-3 text-xs leading-5 text-[#aeb8c2]">{requestStatus}</p>
              </div>
            </details>

            <details className="border border-[#2a3440] bg-[#0d1117]" open>
              <summary className="cursor-pointer px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#8fdc8f]">
                Live Stream Camera
              </summary>
              <div className="border-t border-[#2a3440] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-[#aeb8c2]">
                    Locked until an approved scheduled session is active.
                  </p>
                  <span className="h-2.5 w-2.5 shrink-0 bg-[#7f8c99]" aria-hidden="true" />
                </div>
                <LockedLiveRunPanel dark />
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
            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Robot model</p>
              <p className="mt-2 text-sm font-semibold text-white">{robotModel}</p>
              <p className="mt-1 text-xs leading-5 text-[#7f8c99]">Aegies is the enabled robot model for this hardware check.</p>
            </div>
            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Test type</p>
              <p className="mt-2 text-sm font-semibold text-white">{runMode}</p>
              <p className="mt-1 text-xs leading-5 text-[#7f8c99]">{runModeDescription}</p>
            </div>
            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Step 3 / Step 4 Review</p>
              <p className="mt-2 font-mono text-xs leading-5 text-[#cdd6df]">{plan.motionCount} motion commands</p>
              <p className="mt-1 text-xs leading-5 text-[#7f8c99]">
                {isInternalCompanyAccount
                  ? "Physical Hardware Check must pass first. Company credits may be charged, but balance never blocks internal testing."
                  : "Physical Hardware Check must pass before Software Check uses account credits."}
              </p>
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
              onClick={() => void runPhysicalSafetyCheck()}
              disabled={isLoadingReviewGate || isRunningPhysicalCheck || isRunningSoftwareCheck}
              className="w-full border border-[#93c5fd] bg-[#101d2e] px-4 py-3 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRunningPhysicalCheck ? "Checking..." : "Run Physical Hardware Check"}
            </button>
            <button
              type="button"
              onClick={() => void runSoftwareCheck()}
              disabled={isLoadingReviewGate || !physicalSafetyPassed || isRunningPhysicalCheck || isRunningSoftwareCheck || softwareReviewStatus !== "locked"}
              className="w-full border border-[#8fdc8f] bg-[#102015] px-4 py-3 text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a] disabled:cursor-not-allowed disabled:border-[#2a3440] disabled:bg-[#151a20] disabled:text-[#687583]"
            >
              {isRunningSoftwareCheck ? "Checking..." : softwareReviewStatus === "locked" ? "Run Software Check" : "Software Check Used"}
            </button>
            {canScheduleRobotSlot ? (
              <Link
                href={robotSchedulingPath}
                className="block w-full border border-[#8fdc8f] bg-[#17351f] px-4 py-3 text-center text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a]"
              >
                Schedule Live Stream
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed border border-[#2a3440] bg-[#151a20] px-4 py-3 text-sm font-semibold text-[#687583]"
              >
                Live Stream Locked
              </button>
            )}
            <p className="border border-[#2a3440] bg-[#0d1117] p-3 text-sm leading-6 text-[#aeb8c2]">{requestStatus}</p>

            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Live Stream Camera</p>
                  <p className="mt-1 text-xs leading-5 text-[#aeb8c2]">
                    Locked until an approved scheduled session is active.
                  </p>
                </div>
                <span className="h-2.5 w-2.5 bg-[#7f8c99]" aria-hidden="true" />
              </div>
              <div className="mt-3">
                <LockedLiveRunPanel dark />
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
