import { NextResponse } from "next/server";
import { isAuthorizedMasterGateway } from "@/lib/master-live-camera-gateway-auth";
import {
  selectionForMasterGatewayTransport,
  selectActiveMasterGatewaySession,
  type MasterGatewaySessionRow,
} from "@/lib/master-live-camera-gateway-session";
import { getMasterViewSelection } from "@/lib/master-live-camera-state";
import { createMasterPublisherToken } from "@/lib/master-livekit-publisher";
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

  const transport = new URL(request.url).searchParams.get("transport");
  const selection = selectionForMasterGatewayTransport(
    await getMasterViewSelection(session.id),
    transport,
  );
  if (!selection) {
    return NextResponse.json({ active: false }, { headers: noStoreHeaders });
  }

  const roomName = process.env.MASTER_LIVEKIT_ROOM_NAME || "master-live-1";
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || "";
  const publisherToken = await createMasterPublisherToken({
    apiKey: process.env.LIVEKIT_API_KEY || "",
    apiSecret: process.env.LIVEKIT_API_SECRET || "",
    roomName,
    sessionId: session.id,
  });

  return NextResponse.json({
    active: true,
    sessionId: session.id,
    roomName,
    livekitUrl,
    publisherToken,
    selection,
    expiresAt: session.scheduledEnd,
  }, { headers: noStoreHeaders });
}
