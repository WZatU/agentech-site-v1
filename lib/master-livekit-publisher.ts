import { AccessToken } from "livekit-server-sdk";

export async function createMasterPublisherToken({
  apiKey,
  apiSecret,
  roomName,
  sessionId,
}: {
  apiKey: string;
  apiSecret: string;
  roomName: string;
  sessionId: number;
}) {
  if (!apiKey || !apiSecret) throw new Error("LiveKit publisher credentials are not configured.");
  const token = new AccessToken(apiKey, apiSecret, {
    identity: `master-gateway-${sessionId}`,
    name: "Master Camera Gateway",
    ttl: "5m",
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: false,
    canPublishData: false,
  });
  return token.toJwt();
}
