import { NextResponse } from "next/server";
import { isAuthorizedMasterGateway } from "@/lib/master-live-camera-gateway-auth";
import {
  selectActiveMasterGatewaySession,
  type MasterGatewaySessionRow,
} from "@/lib/master-live-camera-gateway-session";
import { getMasterViewSelection } from "@/lib/master-live-camera-state";
import { supabaseRequest } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  const secret = process.env.MASTER_CAMERA_GATEWAY_SECRET ?? "";
  if (!isAuthorizedMasterGateway(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: noStoreHeaders });
  }

  const now = new Date();
  const rows = await supabaseRequest<MasterGatewaySessionRow[]>("agentech_robot_sessions", {
    query: [
      `scheduled_start=lte.${encodeURIComponent(now.toISOString())}`,
      `scheduled_end=gte.${encodeURIComponent(now.toISOString())}`,
      "select=id,robot_model,session_status,scheduled_start,scheduled_end",
      "order=scheduled_start.asc",
      "limit=10",
    ].join("&"),
  }).catch(() => []);
  const session = selectActiveMasterGatewaySession(rows, now);
  if (!session || session.robotModel !== "Master") {
    return NextResponse.json({ active: false }, { headers: noStoreHeaders });
  }

  return NextResponse.json({
    active: true,
    sessionId: session.id,
    roomName: process.env.LIVEKIT_ROOM_NAME || "master-live-1",
    selection: await getMasterViewSelection(session.id),
    expiresAt: session.scheduledEnd,
  }, { headers: noStoreHeaders });
}
