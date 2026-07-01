import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { accountSessionCookieName } from "@/lib/account-session";
import { getAccountRecord } from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

export const dynamic = "force-dynamic";

const defaultRoomName = process.env.LIVEKIT_ROOM_NAME || "aegis-lab-1";

function isInternalEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@agent-tech.ai");
}

export async function GET(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "LiveKit is not configured." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const email = normalizeEmail(cookieStore.get(accountSessionCookieName)?.value);
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Sign in before viewing the live robot session." }, { status: 401 });
  }

  const account = await getAccountRecord(email);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (!isInternalEmail(email) && Number(account.credit_balance ?? 0) <= 0) {
    return NextResponse.json({ error: "Live robot viewing requires account credits." }, { status: 402 });
  }

  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get("room") || defaultRoomName;
  const viewerId = `website-viewer-${email.replace(/[^a-z0-9_-]/gi, "-")}-${crypto.randomUUID()}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: viewerId,
    name: email,
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
