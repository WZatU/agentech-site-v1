import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { validateAgentechCode } from "@/lib/agentech-validation";

const aegisHeightRoot = path.resolve(process.cwd(), "..", "Aegies-Height");
const simulationCache = new Map<string, { createdAt: number; payload: unknown }>();
const cacheTtlMs = 5 * 60 * 1000;
const simulationTimeoutMs = 12_000;

type SimFrame = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

type ParsedCommand = {
  action: string;
  args: string;
};

function numberArg(args: string, name: string, fallback: number) {
  const match = args.match(new RegExp(`${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : fallback;
}

function parseCommands(code: string): ParsedCommand[] {
  const calls: ParsedCommand[] = [];
  const pattern = /(?:Agentech|dog)\.(\w+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code)) !== null) {
    calls.push({ action: match[1], args: match[2] });
  }
  return calls;
}

function addInterpolatedFrame(frames: SimFrame[], next: SimFrame, count = 8) {
  const start = frames[frames.length - 1] ?? { x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 };
  for (let index = 1; index <= count; index += 1) {
    const t = index / count;
    frames.push({
      x: start.x + (next.x - start.x) * t,
      y: start.y + (next.y - start.y) * t,
      z: start.z + (next.z - start.z) * t,
      yaw: start.yaw + (next.yaw - start.yaw) * t,
      pitch: start.pitch + (next.pitch - start.pitch) * t
    });
  }
}

function buildHostedFrames(code: string) {
  const frames: SimFrame[] = [{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }];

  for (const command of parseCommands(code)) {
    const current = frames[frames.length - 1];
    const yawRadians = (current.yaw * Math.PI) / 180;
    const speed = numberArg(command.args, "speed", command.action === "backward" ? 0.2 : 0.3);
    const seconds = numberArg(command.args, "seconds", 1);
    const angle = numberArg(command.args, "angle", command.action.includes("right") ? -45 : 45);

    if (command.action === "forward" || command.action === "backward") {
      const direction = command.action === "forward" ? 1 : -1;
      const distance = direction * speed * seconds;
      addInterpolatedFrame(frames, {
        ...current,
        x: current.x + Math.cos(yawRadians) * distance,
        y: current.y + Math.sin(yawRadians) * distance
      });
    }

    if (command.action === "yaw") {
      addInterpolatedFrame(frames, {
        ...current,
        yaw: current.yaw + ((speed * seconds * 180) / Math.PI)
      });
    }

    if (command.action === "rotate") {
      addInterpolatedFrame(frames, { ...current, yaw: current.yaw + angle });
    }

    if (command.action === "left" || command.action === "turn_left") {
      addInterpolatedFrame(frames, { ...current, yaw: current.yaw + Math.abs(angle) });
    }

    if (command.action === "right" || command.action === "turn_right") {
      addInterpolatedFrame(frames, { ...current, yaw: current.yaw - Math.abs(angle) });
    }

    if (command.action === "look_up") {
      addInterpolatedFrame(frames, { ...current, pitch: Math.min(20, Math.abs(angle)) }, 10);
    }

    if (command.action === "look_down") {
      addInterpolatedFrame(frames, { ...current, pitch: -Math.min(25, Math.abs(angle)) }, 10);
    }

    if (command.action === "camera_pitch") {
      addInterpolatedFrame(frames, { ...current, pitch: Math.max(-25, Math.min(20, angle)) }, 10);
    }

    if (command.action === "pitch") {
      addInterpolatedFrame(frames, { ...current, pitch: Math.max(-25, Math.min(20, current.pitch + speed * seconds * 57.2958)) }, 10);
    }
  }

  return frames.length > 1 ? frames : [{ x: 0, y: 0, z: 0.37, yaw: 0, pitch: 0 }];
}

function hostedPreviewPayload(code: string, reason: string) {
  const frames = buildHostedFrames(code);
  const renderedFrames = frames.slice(0, 24).map(() => "/assets/products/aegis-mujoco-ready.png?v=hosted-preview-safe");
  return {
    steps: frames.length,
    frames,
    final_pose: frames[frames.length - 1],
    rendered_frames: renderedFrames,
    renderer: "hosted-preview",
    warning: reason
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code.trim()) {
    return NextResponse.json({ error: "No Agentech code provided." }, { status: 400 });
  }

  const validationErrors = validateAgentechCode(code);
  if (validationErrors.length) {
    return NextResponse.json({ error: validationErrors.join(" ") }, { status: 400 });
  }

  const cacheKey = crypto.createHash("sha1").update(`agentech-sim-v4:${code}`).digest("hex");
  const cached = simulationCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
    return NextResponse.json({ ...(cached.payload as object), cached: true });
  }

  const simulatorScript = path.join(aegisHeightRoot, "scripts", "agentech_simulate_code.py");
  if (!fs.existsSync(simulatorScript)) {
    const payload = hostedPreviewPayload(code, "Hosted preview active; command path and safety limits validated.");
    simulationCache.set(cacheKey, { createdAt: Date.now(), payload });
    return NextResponse.json(payload);
  }

  const result = await new Promise<{ status: number; stdout: string; stderr: string; timedOut?: boolean }>((resolve) => {
    const child = spawn("python", ["scripts/agentech_simulate_code.py"], {
      cwd: aegisHeightRoot,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const finish = (status: number, timedOut = false) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve({ status, stdout, stderr, timedOut });
    };
    const timeout = setTimeout(() => {
      stderr += `Simulation timed out after ${simulationTimeoutMs / 1000}s.`;
      child.kill("SIGKILL");
      finish(124, true);
    }, simulationTimeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      stderr += error.message;
      finish(1);
    });
    child.on("close", (status) => {
      finish(status ?? 1);
    });
    child.stdin.end(JSON.stringify({ code, max_render_frames: 12, render_width: 480, render_height: 320 }));
  });

  if (result.status !== 0) {
    if (result.stderr.includes("ENOENT")) {
      const payload = hostedPreviewPayload(code, "Hosted preview active; command path and safety limits validated.");
      simulationCache.set(cacheKey, { createdAt: Date.now(), payload });
      return NextResponse.json(payload);
    }
    return NextResponse.json(
      { error: result.stderr || result.stdout || "Simulation failed." },
      { status: result.timedOut ? 504 : 500 }
    );
  }

  try {
    const payload = JSON.parse(result.stdout);
    simulationCache.set(cacheKey, { createdAt: Date.now(), payload });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Simulation returned invalid output." }, { status: 500 });
  }
}
