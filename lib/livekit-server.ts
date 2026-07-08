import { AccessToken } from "livekit-server-sdk";
import { getLiveRoom, LiveRoomError } from "@/lib/live-room-server";

export function getLiveKitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim() ?? "";
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim() ?? "";
  const url = process.env.LIVEKIT_URL?.trim() ?? "";

  if (!apiKey || !apiSecret || !url) {
    throw new LiveRoomError(
      "LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env",
      503,
    );
  }

  return { apiKey, apiSecret, url };
}

export function getLiveKitRoomName(sessionId: string) {
  return `lms-session-${sessionId}`;
}

export async function createLiveKitToken(sessionId: string) {
  // Ensures the caller has access to this LMS live session first.
  const room = await getLiveRoom(sessionId);

  if (room.isWaiting || room.isRejected) {
    throw new LiveRoomError(
      room.isRejected
        ? "Host declined your join request."
        : "You are still in the waiting room.",
      403,
    );
  }

  if (room.session.status === "COMPLETED" || room.session.status === "CANCELLED") {
    throw new LiveRoomError("This live session has already ended.", 400);
  }

  const { apiKey, apiSecret, url } = getLiveKitConfig();
  const roomName = getLiveKitRoomName(sessionId);

  const at = new AccessToken(apiKey, apiSecret, {
    identity: room.currentUser.id,
    name: room.currentUser.name || room.currentUser.email || room.currentUser.id,
    ttl: "6h",
    metadata: JSON.stringify({
      role: room.isHost ? "HOST" : "PARTICIPANT",
      sessionId,
    }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    url,
    roomName,
    identity: room.currentUser.id,
    isHost: room.isHost,
  };
}
