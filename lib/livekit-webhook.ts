import { WebhookReceiver, type WebhookEvent } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";
import {
  getLiveKitConfig,
  getLiveKitRoomName,
  removeLiveKitParticipant,
} from "@/lib/livekit-server";
import { AttendanceStatus, SessionStatus } from "@/lib/generated/prisma/enums";

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
  const event = await verifyLiveKitWebhook(body, authHeader);
  return processLiveKitWebhookEvent(event);
}

export async function verifyLiveKitWebhook(body: string, authHeader: string | null) {
  const { apiKey, apiSecret } = getLiveKitConfig();
  const receiver = new WebhookReceiver(apiKey, apiSecret);
  return receiver.receive(body, authHeader ?? undefined);
}

export async function processLiveKitWebhookEvent(event: WebhookEvent) {
  if (event.event === "participant_joined") {
    const sessionId = sessionIdFromRoomName(event.room?.name);
    const identity = event.participant?.identity;
    if (!sessionId || !identity) return { handled: false as const };

    const session = await prisma.liveClassSession.findUnique({
      where: { id: sessionId },
      select: {
        status: true,
        liveClass: { select: { instructorId: true } },
        attendances: {
          where: { userId: identity },
          select: { status: true, leaveTime: true },
          take: 1,
        },
      },
    });
    const attendance = session?.attendances[0];
    const activeAttendance =
      attendance?.leaveTime === null &&
      (attendance.status === AttendanceStatus.PRESENT ||
        attendance.status === AttendanceStatus.LATE);
    const closed =
      session?.status === SessionStatus.COMPLETED ||
      session?.status === SessionStatus.CANCELLED;
    const allowed =
      Boolean(session) &&
      !closed &&
      (session!.liveClass.instructorId === identity || activeAttendance);

    if (!allowed) await removeLiveKitParticipant(sessionId, identity);
    return { handled: true as const, sessionId, participantAuthorized: allowed };
  }

  if (event.event !== "egress_ended") {
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
