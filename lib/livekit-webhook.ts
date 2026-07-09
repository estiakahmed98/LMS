import { WebhookReceiver } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import { getLiveKitConfig, getLiveKitRoomName } from "@/lib/livekit-server";

function sessionIdFromRoomName(roomName: string | undefined) {
  if (!roomName) return null;
  const prefix = "lms-session-";
  return roomName.startsWith(prefix) ? roomName.slice(prefix.length) : null;
}

function bytesToMb(size: bigint | number | undefined) {
  if (size == null) return null;
  const n = Number(size);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n / (1024 * 1024)) * 10) / 10;
}

/** Handle LiveKit webhook events (egress ended → persist recordingUrl). */
export async function handleLiveKitWebhook(body: string, authHeader: string | null) {
  const { apiKey, apiSecret } = getLiveKitConfig();
  const receiver = new WebhookReceiver(apiKey, apiSecret);
  const event = await receiver.receive(body, authHeader ?? undefined);

  if (event.event !== "egress_ended" && !event.egressInfo) {
    return { handled: false as const };
  }

  const egress = event.egressInfo;
  if (!egress) {
    return { handled: false as const };
  }
  const sessionId = sessionIdFromRoomName(egress.roomName);
  if (!sessionId) {
    return { handled: false as const, reason: "unknown_room" };
  }

  const file = egress.fileResults?.[0];
  const recordingUrl = file?.location || file?.filename || null;
  const recordingSizeMb = bytesToMb(file?.size);

  await prisma.liveClassSession.updateMany({
    where: { id: sessionId, recordingEgressId: egress.egressId },
    data: {
      recordingStatus: recordingUrl ? "COMPLETE" : "FAILED",
      recordingUrl: recordingUrl ?? undefined,
      recordingSizeMb: recordingSizeMb ?? undefined,
      recordingEgressId: null,
    },
  });

  return {
    handled: true as const,
    sessionId,
    egressId: egress.egressId,
    recordingUrl,
  };
}

export function getLiveKitRoomNameForSession(sessionId: string) {
  return getLiveKitRoomName(sessionId);
}
