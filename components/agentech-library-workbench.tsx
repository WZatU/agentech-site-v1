"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { agentechFunctions, starterCode, type AgentechFunction } from "@/lib/agentech-library";

const categories = ["All", "Movement", "Posture", "Safety", "Sensing", "Interaction", "Workflow"] as const;
type Category = (typeof categories)[number];
type SimFrame = { x: number; y: number; z: number; yaw: number; pitch?: number };

const categoryExamples: Record<Category, { activeName: string; code: string }> = {
  All: {
    activeName: "forward",
    code: `from agentech import Agentech

Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.left(angle=45)
Agentech.right(angle=45)
Agentech.yaw(speed=0.25, seconds=1)
Agentech.stand()
Agentech.look_up(angle=15)
Agentech.capture_image(output="height_photo.jpg")
Agentech.look_down(angle=15)
Agentech.stop()`
  },
  Movement: {
    activeName: "forward",
    code: `from agentech import Agentech

Agentech.forward(speed=0.3, seconds=1)
Agentech.backward(speed=0.2, seconds=1)
Agentech.left(angle=45)
Agentech.right(angle=45)
Agentech.yaw(speed=0.25, seconds=1)`
  },
  Posture: {
    activeName: "stand",
    code: `from agentech import Agentech

Agentech.stand()
Agentech.sit()`
  },
  Safety: {
    activeName: "stop",
    code: `from agentech import Agentech

Agentech.stop()
Agentech.emergency_stop(reason="operator stop")`
  },
  Sensing: {
    activeName: "look_up",
    code: `from agentech import Agentech

Agentech.stand()
Agentech.look_up(angle=15)
Agentech.capture_image(output="height_top.jpg")
Agentech.look_down(angle=15)
Agentech.capture_image(output="height_bottom.jpg")`
  },
  Interaction: {
    activeName: "say",
    code: `from agentech import Agentech

Agentech.say("Hello from Agentech")`
  },
  Workflow: {
    activeName: "run_sequence",
    code: `from agentech import Agentech

Agentech.run_sequence([
    {"action": "forward", "params": {"speed": 0.3, "seconds": 1}},
    {"action": "left", "params": {"angle": 45}},
    {"action": "stop"}
])`
  }
};

function stringArg(args: string, name: string, fallback: string) {
  const match = args.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`));
  return match ? match[1] : fallback;
}

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
    const label = command === "say" ? `say("${stringArg(args, "text", args.replace(/^["']|["']$/g, "") || "message")}")` : `${command}${displayArgs}`;
    trace.push(label);
  }

  return {
    trace: trace.length ? trace : ["No Agentech commands found yet."],
    motionCount: trace.filter((line) => /forward|backward|left|right|turn_left|turn_right|yaw|rotate|look_up|look_down|camera_pitch|pitch/.test(line)).length
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
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Internal Mapping</p>
            <p className="mt-2 font-mono text-sm text-[#8fdc8f]">{item.actionCard}</p>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">FF SDK Grounding</p>
            <p className="mt-2 font-mono text-xs leading-5 text-[#cdd6df]">{item.grounding}</p>
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
              This page is the documentation. Students can learn the library, see every function, test code in MuJoCo, and submit pasted code or a GitHub branch for robot review without leaving this screen.
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
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#e5edf5]">{`pip install git+https://github.com/agent-tech0316/Aegies-Height.git

from agentech import Agentech

Agentech.forward()
Agentech.left(angle=45)
Agentech.look_up(angle=15)`}</pre>
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
    ["forward", "backward", "left", "right", "yaw", "look_up", "look_down", "stand", "stop", "capture_image"].includes(item.name)
  );
  const workflowExample = `from agentech import Agentech

with Agentech.robot(dry_run=True) as dog:
    dog.stand()
    dog.forward(speed=0.25, seconds=1)
    dog.left(angle=45)
    dog.look_up(angle=15)
    dog.capture_image(output="height_top.jpg")
    dog.look_down(angle=15)
    dog.capture_image(output="height_bottom.jpg")
    dog.stop()`;
  const submitExample = `# Option 1: paste code into this page
Agentech.forward()
Agentech.left(angle=45)

# Option 2: submit a GitHub repo and branch
repo = "https://github.com/team/robot-project"
branch = "main"`;
  const robotRunnerExample = `# student_forward.py
from agentech import Agentech

Agentech.forward()

# Agentech deployment runner copies it to the robot over SSH:
python scripts/run_agentech_on_robot.py student_forward.py --host 192.168.234.1`;

  return (
    <section id="agentech-docs" className="border-t border-[#2a3440] bg-[#0f1318]">
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8fdc8f]">Agentech Docs</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">One page to install, write, simulate, and submit robot dog code.</h2>
          <p className="mt-4 text-sm leading-7 text-[#b8c2cc]">
            These docs are written for students and developers who need to move the Aegis robot quickly without reading the FF SDK internals first. The common path is simple: install the package, import Agentech, write one-line commands, preview in MuJoCo, then submit code or a GitHub branch for a supervised robot session.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="border border-[#2a3440] bg-[#0d1117] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">1. Install</p>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#8fdc8f]">pip install git+https://github.com/agent-tech0316/Aegies-Height.git</pre>
            <p className="mt-3 text-sm leading-6 text-[#aeb8c2]">Use this GitHub install now. Later, after PyPI publishing, the target command becomes `pip install agentech`.</p>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">2. Import</p>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-[#e5edf5]">from agentech import Agentech</pre>
            <p className="mt-3 text-sm leading-6 text-[#aeb8c2]">Everything students need starts from this one class. The method names are intentionally plain English.</p>
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
                    <th className="px-4 py-3">SDK grounding</th>
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
                      <td className="px-4 py-3 font-mono text-xs text-[#93c5fd]">{item.grounding}</td>
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
                <p>Yaw rate is capped at +/-2.09 rad/s.</p>
                <p>Look up is capped at 20 degrees; look down is capped at 25 degrees.</p>
                <p>Pitch velocity is capped at +/-0.5 rad/s.</p>
                <p>Motion commands are capped at 10 seconds.</p>
                <p>Emergency stop is exposed as `Agentech.emergency_stop()`.</p>
              </div>
            </div>
            <div className="border border-[#2a3440] bg-[#0d1117] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">MuJoCo Preview</p>
              <p className="mt-3 text-sm leading-6 text-[#cdd6df]">
                The preview uses the Aegis MuJoCo model from the FF assets. Forward and backward move the dog, left/right/yaw rotate it, and look up/down tilt the robot body/camera like the height-photo demo while the observer view stays stable.
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
              Students can paste code directly into the editor or submit a GitHub repository URL plus branch. The request is stored for review before any supervised live robot run.
            </div>
          </div>
          <div className="border border-[#2a3440] bg-[#0d1117] lg:col-span-2">
            <div className="border-b border-[#2a3440] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Robot Hotspot Deployment</p>
            </div>
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-6 text-[#e5edf5]">{robotRunnerExample}</pre>
              <div className="border-t border-[#2a3440] p-4 text-sm leading-6 text-[#aeb8c2] lg:border-l lg:border-t-0">
                The student file stays tiny. The runner connects through the robot hotspot, copies the file over SSH, sets the Aegis variant, disables dry-run, and runs the code on the robot. `Agentech.forward()` then stands, waits, moves forward, stops, and closes safely.
              </div>
            </div>
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
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Internal card</p>
                <p className="mt-1 font-mono text-xs leading-5 text-[#93c5fd]">{item.actionCard}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AgentechLibraryWorkbench() {
  const [code, setCode] = useState(starterCode);
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [activeName, setActiveName] = useState("forward");
  const [requestStatus, setRequestStatus] = useState("Ready for a supervised robot session request.");
  const [developerName, setDeveloperName] = useState("");
  const [robotModel, setRobotModel] = useState("Aegis Ultra");
  const [runMode, setRunMode] = useState("Dry-run review");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [mujocoStatus, setMujocoStatus] = useState("Aegis MuJoCo URDF is installed locally. Run the code to move the dog preview.");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simFrames, setSimFrames] = useState<SimFrame[]>([{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }]);
  const [simFrameIndex, setSimFrameIndex] = useState(0);
  const [renderedFrames, setRenderedFrames] = useState<string[]>([]);
  const [previewRenderer, setPreviewRenderer] = useState<"mujoco" | "hosted-preview">("mujoco");

  const filteredFunctions = useMemo(
    () => agentechFunctions.filter((item) => activeCategory === "All" || item.category === activeCategory),
    [activeCategory]
  );

  const activeFunction = agentechFunctions.find((item) => item.name === activeName) ?? agentechFunctions[0];
  const plan = useMemo(() => commandPlan(code), [code]);
  const previewFrameIndex =
    renderedFrames.length > 1
      ? Math.min(
          simFrames.length - 1,
          Math.max(0, Math.round((simFrameIndex / Math.max(1, renderedFrames.length - 1)) * Math.max(0, simFrames.length - 1)))
        )
      : Math.min(simFrameIndex, simFrames.length - 1);
  const previewFrame = simFrames[previewFrameIndex] ?? simFrames[0];
  const cameraPitch = Math.max(-45, Math.min(45, previewFrame.pitch ?? 0));
  const renderedFrame = renderedFrames[Math.min(simFrameIndex, renderedFrames.length - 1)];
  const displayRenderedFrame = previewRenderer === "hosted-preview" ? undefined : renderedFrame;

  useEffect(() => {
    if (renderedFrames.length <= 1) {
      return;
    }

    setSimFrameIndex(0);
    const interval = window.setInterval(() => {
      setSimFrameIndex((current) => {
        if (current >= renderedFrames.length - 1) {
          return 0;
        }
        return current + 1;
      });
    }, 42);

    return () => window.clearInterval(interval);
  }, [renderedFrames, simFrames]);

  function resetPreview() {
    setMujocoStatus("Aegis MuJoCo URDF is installed locally. Run the code to move the dog preview.");
    setSimFrames([{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }]);
    setSimFrameIndex(0);
    setRenderedFrames([]);
    setPreviewRenderer("mujoco");
  }

  function loadExample(item: AgentechFunction) {
    setActiveName(item.name);
    setCode(`from agentech import Agentech\n\n${item.example}`);
    resetPreview();
  }

  function loadCategory(category: Category) {
    const example = categoryExamples[category];
    setActiveCategory(category);
    setActiveName(example.activeName);
    setCode(example.code);
    resetPreview();
  }

  async function runMuJoCoSimulation() {
    setIsSimulating(true);
    setMujocoStatus("Running Aegis MuJoCo simulation...");
    setSimFrames([{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }]);
    setSimFrameIndex(0);
    setRenderedFrames([]);
    setPreviewRenderer("mujoco");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/agentech-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({ error: "Simulation returned an unreadable response." }));
      if (!response.ok) {
        throw new Error(payload.error ?? "Simulation failed");
      }
      const pose = payload.final_pose;
      const frames = Array.isArray(payload.frames) && payload.frames.length ? payload.frames : [pose];
      setSimFrames(frames);
      setSimFrameIndex(0);
      setRenderedFrames(Array.isArray(payload.rendered_frames) ? payload.rendered_frames : []);
      setPreviewRenderer(payload.renderer === "hosted-preview" ? "hosted-preview" : "mujoco");
      const statusPrefix = payload.renderer === "hosted-preview" ? "Hosted simulator preview" : "MuJoCo";
      const warning = typeof payload.warning === "string" ? ` ${payload.warning}` : "";
      setMujocoStatus(
        `${statusPrefix} ran ${payload.steps} steps. Final pose x=${pose.x.toFixed(2)}, y=${pose.y.toFixed(2)}, yaw=${pose.yaw.toFixed(1)}deg, tilt=${(pose.pitch ?? 0).toFixed(1)}deg.${warning}`
      );
    } catch (error) {
      setRenderedFrames([]);
      setPreviewRenderer("mujoco");
      setMujocoStatus(error instanceof Error && error.name === "AbortError" ? "Simulation timed out after 15s. Try fewer commands or run again." : error instanceof Error ? error.message : "Simulation failed.");
    } finally {
      window.clearTimeout(timeout);
      setIsSimulating(false);
    }
  }

  async function submitCodeForReview() {
    setIsSubmittingCode(true);
    setRequestStatus("Submitting code package for robot review...");
    try {
      const response = await fetch("/api/agentech-code-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          developerName,
          robotModel,
          runMode,
          code,
          githubRepoUrl,
          githubBranch,
          commands: plan.trace
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Code submission failed.");
      }
      const source = payload.source === "github" ? `GitHub branch ${payload.githubBranch}` : `${payload.commandCount} commands`;
      setRequestStatus(`Submitted ${source}. Review ID: ${payload.id}.`);
    } catch (error) {
      setRequestStatus(error instanceof Error ? error.message : "Code submission failed.");
    } finally {
      setIsSubmittingCode(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
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
      <section className="border-b border-[#2a3440] bg-[#101418]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Image
                src="/assets/logo/AGENTECH-products.png"
                alt="Agentech Products"
                width={260}
                height={64}
                className="h-9 w-auto object-contain"
                priority
              />
              <span className="border border-[#8fdc8f]/50 bg-[#132117] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#8fdc8f]">
                Hidden Developer Lab
              </span>
            </div>
            <h1 className="mt-8 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
              Agentech Robot Dog Library
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#b8c2cc]">
              A clean Python layer for Aegis robot commands: movement, posture, yaw, safety, camera, status, and short sequences in calls students can read at a glance.
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
                  pip install git+https://github.com/agent-tech0316/Aegies-Height.git
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

      <DocsOverview />

      <main id="code-workbench" className="mx-auto grid max-w-7xl scroll-mt-6 gap-0 border-x border-[#2a3440] lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-[#2a3440] bg-[#11151b] lg:border-b-0 lg:border-r">
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
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(430px,0.85fr)]">
            <div>
              <textarea
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  resetPreview();
                }}
                spellCheck={false}
                className="h-[520px] w-full resize-none border-0 bg-[#0d1117] p-5 font-mono text-sm leading-7 text-[#e5edf5] outline-none selection:bg-[#275c37]"
              />
            </div>
            <div className="border-t border-[#2a3440] bg-[#11151b] xl:border-l xl:border-t-0">
              <div className="border-b border-[#2a3440] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8c99]">MuJoCo Preview</p>
                  <p className="font-mono text-xs text-[#93c5fd]">fixed observer camera</p>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#8fdc8f]">
                    {previewRenderer === "hosted-preview" ? "Aegis hosted preview" : "Aegis MuJoCo render"}
                  </p>
                  <p className="font-mono text-xs text-[#7f8c99]">{previewRenderer === "hosted-preview" ? "validated frames" : "real model frames"}</p>
                </div>
                <div className="relative mx-auto aspect-[13/9] w-full overflow-hidden border border-[#2a3440] bg-black">
                  {displayRenderedFrame ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayRenderedFrame}
                      alt="Rendered Aegis MuJoCo simulation frame"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/assets/products/aegis-mujoco-ready.png?v=ff-demo-gait"
                      alt="Aegis MuJoCo model ready"
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 border border-[#2a3440] bg-[#0d1117] text-center font-mono text-xs">
                  <div className="border-r border-[#2a3440] p-2">model ready</div>
                  <div className="border-r border-[#2a3440] p-2">{previewRenderer === "hosted-preview" ? "hosted" : "mujoco"}</div>
                  <div className="p-2">{plan.motionCount} moves</div>
                </div>
                <button
                  type="button"
                  onClick={runMuJoCoSimulation}
                  disabled={isSimulating}
                  className="mt-4 w-full border border-[#93c5fd] bg-[#101d2e] px-3 py-2 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f]"
                >
                  {isSimulating ? "Running MuJoCo..." : "Run MuJoCo Simulation"}
                </button>
                <p className="mt-3 border border-[#2a3440] bg-[#0d1117] p-3 text-xs leading-5 text-[#aeb8c2]">{mujocoStatus}</p>
                <div className="mt-3 grid grid-cols-2 border border-[#2a3440] bg-[#0d1117] text-center font-mono text-xs text-[#cdd6df]">
                  <div className="border-r border-[#2a3440] p-2">yaw {previewFrame.yaw.toFixed(1)}deg</div>
                  <div className="p-2">tilt {cameraPitch.toFixed(1)}deg</div>
                </div>
                <div className="mt-2 border border-[#2a3440] bg-[#0d1117] p-2 text-center font-mono text-xs text-[#7f8c99]">
                  frame {Math.min(simFrameIndex + 1, renderedFrames.length || simFrames.length)} / {renderedFrames.length || simFrames.length}
                </div>
                <div className="mt-4 max-h-52 space-y-2 overflow-auto">
                  {plan.trace.map((line, index) => (
                    <p key={`${line}-${index}`} className="border border-[#2a3440] bg-[#0d1117] px-3 py-2 font-mono text-xs text-[#cdd6df]">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2a3440] p-4">
            <FunctionReference item={activeFunction} />
          </div>
        </section>

        <aside className="border-t border-[#2a3440] bg-[#11151b] lg:col-start-2">
          <div className="border-b border-[#2a3440] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8c99]">Robot Session</p>
          </div>
          <div className="space-y-4 p-4">
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
                <option>Dry-run review</option>
                <option>Supervised live robot</option>
                <option>Recorded demo result</option>
              </select>
            </label>
            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Code package</p>
              <p className="mt-2 font-mono text-xs leading-5 text-[#cdd6df]">{plan.motionCount} motion commands</p>
              <p className="mt-1 text-xs leading-5 text-[#7f8c99]">Submit the editor code, or attach a GitHub repository branch below.</p>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">GitHub repo URL</span>
              <input
                value={githubRepoUrl}
                onChange={(event) => setGithubRepoUrl(event.target.value)}
                className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-2 text-sm text-white outline-none focus:border-[#8fdc8f]"
                placeholder="https://github.com/team/project"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Branch</span>
              <input
                value={githubBranch}
                onChange={(event) => setGithubBranch(event.target.value)}
                className="mt-2 w-full border border-[#2a3440] bg-[#0d1117] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#8fdc8f]"
                placeholder="main"
              />
            </label>
            <button
              type="button"
              onClick={submitCodeForReview}
              disabled={isSubmittingCode}
              className="w-full border border-[#93c5fd] bg-[#101d2e] px-4 py-3 text-sm font-semibold text-[#dbeafe] transition hover:bg-[#93c5fd] hover:text-[#07111f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingCode ? "Submitting..." : "Submit Code Or Repo"}
            </button>
            <button
              type="button"
              onClick={() => setRequestStatus("Robot session request drafted. Connect this panel to booking/backend when ready.")}
              className="w-full border border-[#8fdc8f] bg-[#17351f] px-4 py-3 text-sm font-semibold text-[#dfffe0] transition hover:bg-[#8fdc8f] hover:text-[#08100a]"
            >
              Request Robot Slot
            </button>
            <p className="border border-[#2a3440] bg-[#0d1117] p-3 text-sm leading-6 text-[#aeb8c2]">{requestStatus}</p>

            <div className="border border-[#2a3440] bg-[#0d1117] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Safety Defaults</p>
              <ul className="mt-3 space-y-2 text-sm text-[#cdd6df]">
                <li>Dry-run first</li>
                <li>Speed capped at 2.37 m/s</li>
                <li>Motion capped at 10 seconds</li>
                <li>Emergency stop is always available</li>
              </ul>
            </div>
          </div>
        </aside>
      </main>
      <DocsSection />
    </div>
  );
}
