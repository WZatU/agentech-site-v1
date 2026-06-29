import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const defaultRoomName = process.env.LIVEKIT_ROOM_NAME || "aegis-lab-1";

export async function GET(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get("room") || defaultRoomName;
  const viewerId = `website-viewer-${crypto.randomUUID()}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: viewerId,
    name: "Agentech Website Viewer",
    ttl: "30m"
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: false
  });

  return NextResponse.json({ token: await token.toJwt(), roomName });
}
