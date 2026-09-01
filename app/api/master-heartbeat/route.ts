import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server.js";
import {
  parseMasterHeartbeatObservation,
  toMasterHeartbeatResponse,
  unavailableMasterHeartbeatResponse,
} from "../../../lib/master-heartbeat.ts";
import {
  readLatestHeartbeat,
  writeLatestHeartbeat,
} from "../../../lib/master-heartbeat-store.ts";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 16 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function hasValidSecret(request: Request, secret: string): boolean {
  const provided = request.headers.get("x-robot-runner-secret")
    ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? "";
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function readBoundedBody(request: Request): Promise<string> {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RangeError("Heartbeat payload is too large");
  }
  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    throw new RangeError("Heartbeat payload is too large");
  }
  return body;
}

export async function POST(request: Request) {
  const secret = process.env.ROBOT_RUNNER_SECRET;
  if (!secret) return json({ error: "Heartbeat receiver is not configured." }, 503);
  if (!hasValidSecret(request, secret)) return json({ error: "Unauthorized." }, 401);

  let body: string;
  try {
    body = await readBoundedBody(request);
  } catch (error) {
    if (error instanceof RangeError) return json({ error: error.message }, 413);
    return json({ error: "Unable to read heartbeat payload." }, 400);
  }

  try {
    const now = new Date();
    const observation = parseMasterHeartbeatObservation(JSON.parse(body), now);
    const receivedAt = now.toISOString();
    await writeLatestHeartbeat({ observation, receivedAt });
    return json({ accepted: true, receivedAt }, 202);
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError) {
      return json({ error: "Invalid heartbeat payload." }, 400);
    }
    console.error("[master-heartbeat] unable to persist heartbeat");
    return json({ error: "Unable to persist heartbeat." }, 500);
  }
}

export async function GET() {
  const record = await readLatestHeartbeat();
  if (!record) return json(unavailableMasterHeartbeatResponse());
  return json(toMasterHeartbeatResponse(
    record.observation,
    new Date(record.receivedAt),
    new Date(),
  ));
}
