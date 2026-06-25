import { spawn } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { validateAgentechCode } from "@/lib/agentech-validation";

const aegisHeightRoot = path.resolve(process.cwd(), "..", "Aegies-Height");
const simulationCache = new Map<string, { createdAt: number; payload: unknown }>();
const cacheTtlMs = 5 * 60 * 1000;
const simulationTimeoutMs = 12_000;

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

  const cacheKey = crypto.createHash("sha1").update(code).digest("hex");
  const cached = simulationCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
    return NextResponse.json({ ...(cached.payload as object), cached: true });
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
