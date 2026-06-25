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
            <p className="text-xs uppercase tracking-[0.14em] text-[#7f8c99]">Action Card</p>
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
  const [simFrames, setSimFrames] = useState<SimFrame[]>([{ x: 0, y: 0, z: 0.45, yaw: 0, pitch: 0 }]);
  const [simFrameIndex, setSimFrameIndex] = useState(0);
  const [renderedFrames, setRenderedFrames] = useState<string[]>([]);

  const filteredFunctions = useMemo(
    () => agentechFunctions.filter((item) => activeCategory === "All" || item.category === activeCategory),
    [activeCategory]
  );

  const activeFunction = agentechFunctions.find((item) => item.name === activeName) ?? agentechFunctions[0];
  const plan = useMemo(() => commandPlan(code), [code]);
  const previewFrame = simFrames[Math.min(simFrameIndex, simFrames.length - 1)] ?? simFrames[0];
  const cameraPitch = Math.max(-45, Math.min(45, previewFrame.pitch ?? 0));
  const renderedFrame =
    renderedFrames[
      Math.min(
        renderedFrames.length - 1,
        Math.max(0, Math.round((simFrameIndex / Math.max(1, simFrames.length - 1)) * Math.max(0, renderedFrames.length - 1)))
      )
    ];

  useEffect(() => {
    if (renderedFrames.length <= 1 || simFrames.length <= 1) {
      return;
    }

    setSimFrameIndex(0);
    const interval = window.setInterval(() => {
      setSimFrameIndex((current) => {
        if (current >= simFrames.length - 1) {
          window.clearInterval(interval);
          return simFrames.length - 1;
        }
        return current + 1;
      });
    }, 70);

    return () => window.clearInterval(interval);
  }, [renderedFrames, simFrames]);

  function loadExample(item: AgentechFunction) {
    setActiveName(item.name);
    setCode(`from agentech import Agentech\n\n${item.example}`);
  }

  function loadCategory(category: Category) {
    const example = categoryExamples[category];
    setActiveCategory(category);
    setActiveName(example.activeName);
    setCode(example.code);
  }

  async function runMuJoCoSimulation() {
    setIsSimulating(true);
    setMujocoStatus("Running Aegis MuJoCo simulation...");
    setSimFrames([{ x: 0, y: 0, z: 0.45, yaw: 0, pitch: 0 }]);
    setSimFrameIndex(0);
    setRenderedFrames([]);
    try {
      const response = await fetch("/api/agentech-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Simulation failed");
      }
      const pose = payload.final_pose;
      const frames = Array.isArray(payload.frames) && payload.frames.length ? payload.frames : [pose];
      setSimFrames(frames);
      setSimFrameIndex(0);
      setRenderedFrames(Array.isArray(payload.rendered_frames) ? payload.rendered_frames : []);
      setMujocoStatus(
        `MuJoCo ran ${payload.steps} steps. Final pose x=${pose.x.toFixed(2)}, y=${pose.y.toFixed(2)}, yaw=${pose.yaw.toFixed(1)}deg, pitch=${(pose.pitch ?? 0).toFixed(1)}deg.`
      );
    } catch (error) {
      setMujocoStatus(error instanceof Error ? error.message : "Simulation failed.");
    } finally {
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

      <main className="mx-auto grid max-w-7xl gap-0 border-x border-[#2a3440] lg:grid-cols-[230px_minmax(0,1fr)_330px]">
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
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                className="h-[520px] w-full resize-none border-0 bg-[#0d1117] p-5 font-mono text-sm leading-7 text-[#e5edf5] outline-none selection:bg-[#275c37]"
              />
            </div>
            <div className="border-t border-[#2a3440] bg-[#11151b] xl:border-l xl:border-t-0">
              <div className="border-b border-[#2a3440] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7f8c99]">MuJoCo Preview</p>
              </div>
              <div className="p-4">
                <div className="relative mx-auto aspect-[4/3] max-w-[360px] overflow-hidden border border-[#2a3440] bg-black">
                  <div className="absolute inset-0 bg-black" />
                  {renderedFrame ? (
                    <Image
                      src={renderedFrame}
                      alt="Rendered Aegis MuJoCo simulation frame"
                      fill
                      sizes="256px"
                      unoptimized
                      className="object-contain"
                    />
                  ) : (
                    <Image
                      src="/assets/products/aegis-mujoco-ready.png?v=ff-demo-gait"
                      alt="Aegis MuJoCo model ready"
                      fill
                      sizes="256px"
                      unoptimized
                      className="object-contain"
                      priority
                    />
                  )}
                  <div className="absolute left-4 top-4 border border-[#2a3440] bg-[#0d1117]/92 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#93c5fd]">
                    Aegis MuJoCo render
                  </div>
                  <div className="absolute bottom-4 right-4 font-mono text-[10px] text-[#7f8c99]">
                    real model frames
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 border border-[#2a3440] bg-[#0d1117] text-center font-mono text-xs">
                  <div className="border-r border-[#2a3440] p-2">model ready</div>
                  <div className="border-r border-[#2a3440] p-2">mujoco</div>
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
                  <div className="p-2">camera pitch {cameraPitch.toFixed(1)}deg</div>
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

        <aside className="border-t border-[#2a3440] bg-[#11151b] lg:border-l lg:border-t-0">
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
                <li>Speed capped at 0.6 m/s</li>
                <li>Motion capped at 10 seconds</li>
                <li>Emergency stop is always available</li>
              </ul>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
