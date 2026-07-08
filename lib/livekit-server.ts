import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
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

function getLiveKitHttpUrl(wsUrl: string) {
  return wsUrl.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:");
}

function createRoomServiceClient() {
  const { apiKey, apiSecret, url } = getLiveKitConfig();
  return new RoomServiceClient(getLiveKitHttpUrl(url), apiKey, apiSecret);
}

/** Best-effort: kick a participant from the LiveKit media room. */
export async function removeLiveKitParticipant(
  sessionId: string,
  identity: string,
) {
  try {
    const client = createRoomServiceClient();
    await client.removeParticipant(getLiveKitRoomName(sessionId), identity);
  } catch (error) {
    console.warn("LIVEKIT_REMOVE_PARTICIPANT_WARN", error);
  }
}

/** Best-effort: close the entire LiveKit room (host end). */
export async function deleteLiveKitRoom(sessionId: string) {
  try {
    const client = createRoomServiceClient();
    await client.deleteRoom(getLiveKitRoomName(sessionId));
  } catch (error) {
    console.warn("LIVEKIT_DELETE_ROOM_WARN", error);
  }
}

export async function createLiveKitToken(sessionId: string) {
  // Ensures the caller has access to this LMS live session first.
  const room = await getLiveRoom(sessionId);

  if (room.isSessionClosed) {
    throw new LiveRoomError("This live session has already ended.", 400);
  }

  if (room.isWaiting || room.isRejected || room.isRemoved) {
    throw new LiveRoomError(
      room.isRejected
        ? "Host declined your join request."
        : room.isRemoved
          ? "You were removed from this live room."
          : "You are still in the waiting room.",
      403,
    );
  }

  const isActiveInRoom = room.participants.some(
    (participant) => participant.id === room.currentUser.id,
  );
  if (!isActiveInRoom) {
    throw new LiveRoomError("You are not currently in this live room.", 403);
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
