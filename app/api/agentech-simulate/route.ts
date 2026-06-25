import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";

const aegisHeightRoot = path.resolve(process.cwd(), "..", "Aegies-Height");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";

  if (!code.trim()) {
    return NextResponse.json({ error: "No Agentech code provided." }, { status: 400 });
  }

  const result = await new Promise<{ status: number; stdout: string; stderr: string }>((resolve) => {
    const child = spawn("python", ["scripts/agentech_simulate_code.py"], {
      cwd: aegisHeightRoot,
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (status) => {
      resolve({ status: status ?? 1, stdout, stderr });
    });
    child.stdin.end(JSON.stringify({ code }));
  });

  if (result.status !== 0) {
    return NextResponse.json({ error: result.stderr || result.stdout || "Simulation failed." }, { status: 500 });
  }

  try {
    return NextResponse.json(JSON.parse(result.stdout));
  } catch {
    return NextResponse.json({ error: "Simulation returned invalid output." }, { status: 500 });
  }
}
