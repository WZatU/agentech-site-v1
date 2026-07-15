import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { validateAgentechCode } from "@/lib/agentech-validation";

const aegisHeightRoot = path.resolve(process.cwd(), "..", "Aegies-Height");
const simulationCache = new Map<string, { createdAt: number; payload: unknown }>();
const cacheTtlMs = 5 * 60 * 1000;
const simulationTimeoutMs = 20_000;
const remoteSimulatorUrl = process.env.AGENTECH_SIMULATOR_URL;

function numberArg(args: string, name: string) {
  const match = args.match(new RegExp(`${name}\\s*=\\s*([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][-+]?\\d+)?)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function turnLevelRateDeg(level: number) {
  return (level / 511) * 3 * 180 / Math.PI;
}

function signedTurnRateRad(args: string) {
  const rateRad = numberArg(args, "turn_rate_rad_s");
  if (rateRad !== null) return rateRad;
  const rateDeg = numberArg(args, "turn_rate_deg_s");
  if (rateDeg !== null) return rateDeg * Math.PI / 180;
  const percent = numberArg(args, "rate_percentage");
  if (percent !== null) return 3 * percent / 100;
  const level = numberArg(args, "turn_level");
  if (level !== null) return turnLevelRateDeg(level) * Math.PI / 180;
  return 2;
}

function signedTurnAngleDeg(args: string) {
  const angleRad = numberArg(args, "angle_rad");
  if (angleRad !== null) return angleRad * 180 / Math.PI;
  const angleDeg = numberArg(args, "angle_deg");
  if (angleDeg !== null) return angleDeg;
  const duration = numberArg(args, "duration_s");
  if (duration !== null) return duration * signedTurnRateRad(args) * 180 / Math.PI;
  return 45;
}

function normalizeCanonicalTurnsForMuJoCo(code: string) {
  const aliasSpeed = 2;
  return code
    .replace(/((?:Agentech|dog))\.turn_right\(\s*\)/g, `$1.turn_right(angle=90, speed=${aliasSpeed})`)
    .replace(/((?:Agentech|dog))\.turn_left\(\s*\)/g, `$1.turn_left(angle=90, speed=${aliasSpeed})`)
    .replace(/((?:Agentech|dog))\.u_turn\(\s*\)/g, `$1.turn_left(angle=180, speed=${aliasSpeed})`)
    .replace(/((?:Agentech|dog))\.yaw\(([^)]*)\)/g, (_match, owner: string, args: string) => {
      const positionRad = numberArg(args, "position_rad");
      const positionDeg = numberArg(args, "position_deg");
      const signedPositionDeg = positionRad !== null ? positionRad * 180 / Math.PI : positionDeg ?? 25.36;
      const direction = signedPositionDeg > 0 ? "right" : "left";
      return `${owner}.twist_${direction}(angle=${Math.abs(signedPositionDeg)})`;
    })
    .replace(/((?:Agentech|dog))\.pitch\(([^)]*)\)/g, (_match, owner: string, args: string) => {
      const positionRad = numberArg(args, "position_rad");
      const positionDeg = numberArg(args, "position_deg");
      const signedPositionDeg = positionRad !== null ? positionRad * 180 / Math.PI : positionDeg ?? 22.98;
      const direction = signedPositionDeg < 0 ? "down" : "up";
      return `${owner}.look_${direction}(angle=${Math.abs(signedPositionDeg)})`;
    })
    .replace(/((?:Agentech|dog))\.roll\(([^)]*)\)/g, "$1.stand()")
    .replace(/((?:Agentech|dog))\.stay\(([^)]*)\)/g, "$1.stand()")
    .replace(/((?:Agentech|dog))\.turn\(([^)]*)\)/g, (_match, owner: string, args: string) => {
      const signedAngle = signedTurnAngleDeg(args);
      const signedRate = signedTurnRateRad(args);
      const direction = (signedAngle || signedRate) < 0 ? "left" : "right";
      const angle = Math.abs(signedAngle);
      const speed = Math.abs(signedRate) || 0.35;
      return `${owner}.turn_${direction}(angle=${angle}, speed=${speed})`;
    });
}

async function runRemoteSimulator(code: string) {
  if (!remoteSimulatorUrl) {
    return null;
  }
  const response = await fetch(remoteSimulatorUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, max_render_frames: 32, render_width: 480, render_height: 320 })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null) {
    const message = payload?.error ?? `Remote simulator failed with status ${response.status}.`;
    throw new Error(message);
  }
  return payload;
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

  const simulatorCode = normalizeCanonicalTurnsForMuJoCo(code);
  const cacheKey = crypto.createHash("sha1").update(`agentech-sim-v13:${simulatorCode}`).digest("hex");
  const cached = simulationCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < cacheTtlMs) {
    return NextResponse.json({ ...(cached.payload as object), cached: true });
  }

  const simulatorScript = path.join(aegisHeightRoot, "scripts", "agentech_simulate_code.py");
  if (!fs.existsSync(simulatorScript)) {
    try {
      const payload = await runRemoteSimulator(simulatorCode);
      if (payload !== null) {
        simulationCache.set(cacheKey, { createdAt: Date.now(), payload });
        return NextResponse.json(payload);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Remote simulator failed." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Real MuJoCo simulator backend is not configured. Set AGENTECH_SIMULATOR_URL for the official site, or run locally with the Aegies-Height simulator folder."
      },
      { status: 503 }
    );
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
    child.stdin.end(JSON.stringify({ code: simulatorCode, max_render_frames: 32, render_width: 480, render_height: 320 }));
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
