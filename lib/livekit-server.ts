import {
  AccessToken,
  EncodedFileOutput,
  EncodedFileType,
  EgressClient,
  EgressStatus,
  DataPacket_Kind,
  RoomServiceClient,
  S3Upload,
  TrackSource,
} from "livekit-server-sdk";
import { getLiveRoom, LiveRoomError, requireLiveRoomHost } from "@/lib/live-room-server";
import { prisma } from "@/lib/prisma";
import type { LiveSharePolicy } from "@/lib/generated/prisma/enums";

/**
 * Access tokens are minted with this TTL. Shorter than the previous fixed
 * 6h: removal/rejection don't revoke an already-issued token, so a shorter
 * TTL bounds how long a kicked user's stale token stays usable. The client
 * (LiveKitMediaStage.tsx) proactively refreshes shortly before expiry so a
 * long session doesn't hit a surprise disconnect.
 */
const LIVEKIT_TOKEN_TTL = "15m";

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

function createEgressClient() {
  const { apiKey, apiSecret, url } = getLiveKitConfig();
  return new EgressClient(getLiveKitHttpUrl(url), apiKey, apiSecret);
}

function buildRecordingFileOutput(sessionId: string) {
  const filepath = `lms-recordings/${sessionId}/{room_name}-{time}.mp4`;
  const accessKey = process.env.LIVEKIT_S3_ACCESS_KEY?.trim() ?? "";
  const secret = process.env.LIVEKIT_S3_SECRET?.trim() ?? "";
  const bucket = process.env.LIVEKIT_S3_BUCKET?.trim() ?? "";
  const region = process.env.LIVEKIT_S3_REGION?.trim() ?? "auto";
  const endpoint = process.env.LIVEKIT_S3_ENDPOINT?.trim() ?? "";

  if (accessKey && secret && bucket) {
    return new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath,
      disableManifest: true,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey,
          secret,
          bucket,
          region,
          endpoint,
          forcePathStyle: Boolean(endpoint),
        }),
      },
    });
  }

  // LiveKit Cloud projects with default storage / self-hosted egress file output.
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    disableManifest: true,
  });
}

function mapEgressStatus(status: EgressStatus | undefined): string {
  switch (status) {
    case EgressStatus.EGRESS_STARTING:
      return "STARTING";
    case EgressStatus.EGRESS_ACTIVE:
      return "ACTIVE";
    case EgressStatus.EGRESS_ENDING:
      return "ENDING";
    case EgressStatus.EGRESS_COMPLETE:
      return "COMPLETE";
    case EgressStatus.EGRESS_FAILED:
    case EgressStatus.EGRESS_ABORTED:
    case EgressStatus.EGRESS_LIMIT_REACHED:
      return "FAILED";
    default:
      return "ACTIVE";
  }
}

function extractRecordingLocation(info: {
  fileResults?: Array<{ location?: string; filename?: string; size?: bigint | number }>;
}) {
  const file = info.fileResults?.[0];
  if (!file) return { url: null as string | null, sizeMb: null as number | null };

  const url = file.location || file.filename || null;
  const rawSize = file.size == null ? null : Number(file.size);
  const sizeMb =
    rawSize != null && Number.isFinite(rawSize)
      ? Math.round((rawSize / (1024 * 1024)) * 10) / 10
      : null;

  return { url, sizeMb };
}

/** Start a Room Composite recording for this LMS live session. */
export async function startLiveKitRecording(sessionId: string) {
  const client = createEgressClient();
  const roomName = getLiveKitRoomName(sessionId);
  const fileOutput = buildRecordingFileOutput(sessionId);

  try {
    const info = await client.startRoomCompositeEgress(roomName, { file: fileOutput }, {
      layout: "speaker",
      audioOnly: false,
      videoOnly: false,
    });

    return {
      egressId: info.egressId,
      status: mapEgressStatus(info.status),
      ...extractRecordingLocation(info),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start LiveKit recording.";
    throw new LiveRoomError(
      `${message} If your LiveKit project needs cloud storage, set LIVEKIT_S3_ACCESS_KEY / SECRET / BUCKET in .env.`,
      502,
    );
  }
}

/** Stop an active egress and return final file location when available. */
export async function stopLiveKitRecording(egressId: string) {
  const client = createEgressClient();

  try {
    const info = await client.stopEgress(egressId);
    return {
      egressId: info.egressId,
      status: mapEgressStatus(info.status),
      ...extractRecordingLocation(info),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stop LiveKit recording.";
    throw new LiveRoomError(message, 502);
  }
}

/** Poll egress status (used after stop while file finalizes). */
export async function getLiveKitRecording(egressId: string) {
  const client = createEgressClient();
  const list = await client.listEgress({ egressId });
  const info = list[0];
  if (!info) {
    throw new LiveRoomError("Recording egress not found.", 404);
  }

  return {
    egressId: info.egressId,
    status: mapEgressStatus(info.status),
    ...extractRecordingLocation(info),
  };
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
    ttl: LIVEKIT_TOKEN_TTL,
    metadata: JSON.stringify({
      role: room.isHost ? "HOST" : "PARTICIPANT",
      sessionId,
    }),
  });

  // Server-side publish-source restriction, not just client-side UI gating:
  // participants only get screen-share publish rights when the session's
  // persisted policy currently allows it. The host always keeps full rights.
  const sessionRow = await prisma.liveClassSession.findUnique({
    where: { id: sessionId },
    select: { screenSharePolicy: true, screenShareAllowedIds: true },
  });
  const mayShareScreen =
    room.isHost ||
    sessionRow?.screenSharePolicy === "ALL_PARTICIPANTS" ||
    Boolean(sessionRow?.screenShareAllowedIds.includes(room.currentUser.id));
  const canPublishSources = mayShareScreen
    ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
    : [TrackSource.CAMERA, TrackSource.MICROPHONE];

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canPublishSources,
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

/**
 * Host-only: persists the session's screen-share policy and immediately
 * updates LiveKit's server-side permission grant for every currently
 * connected non-host participant, so a modified client can't bypass the
 * policy by talking to LiveKit directly — LiveKit itself rejects a
 * screen-share publish from a participant without canPublishSources
 * including SCREEN_SHARE, regardless of what the client attempts.
 */
export async function updateLiveRoomSharePolicy(
  sessionId: string,
  policy: LiveSharePolicy,
  allowedUserIds: string[] = [],
): Promise<void> {
  const { row } = await requireLiveRoomHost(sessionId);

  const batchMemberIds = new Set(
    row.liveClass.batch?.memberships.map((membership) => membership.userId) ?? [],
  );
  const eligibleIds = new Set(
    row.liveClass.course.enrollments
      .filter(
        (enrollment) =>
          row.liveClass.batchId === null || batchMemberIds.has(enrollment.userId),
      )
      .map((enrollment) => enrollment.userId),
  );
  const normalizedAllowedIds = [...new Set(allowedUserIds)];
  if (normalizedAllowedIds.some((id) => !eligibleIds.has(id))) {
    throw new LiveRoomError("Screen-share permission contains an ineligible participant.", 400);
  }

  await prisma.liveClassSession.update({
    where: { id: sessionId },
    data: { screenSharePolicy: policy, screenShareAllowedIds: normalizedAllowedIds },
  });

  const client = createRoomServiceClient();
  const roomName = getLiveKitRoomName(sessionId);

  let participants: Awaited<ReturnType<typeof client.listParticipants>>;
  try {
    participants = await client.listParticipants(roomName);
  } catch (error) {
    // Room may not exist yet (nobody has connected) — persisted policy still
    // applies to every token minted from here on, so this is a soft no-op.
    console.warn("LIVEKIT_LIST_PARTICIPANTS_WARN", error);
    return;
  }

  await Promise.all(
    participants
      .filter((participant) => participant.identity !== row.liveClass.instructorId)
      .map((participant) => {
        const canShare =
          policy === "ALL_PARTICIPANTS" || normalizedAllowedIds.includes(participant.identity);
        const sharedSources = canShare
          ? [TrackSource.CAMERA, TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO]
          : [TrackSource.CAMERA, TrackSource.MICROPHONE];
        return client
          .updateParticipant(roomName, participant.identity, {
            permission: {
              canSubscribe: true,
              canPublish: true,
              canPublishData: true,
              canPublishSources: sharedSources,
              canUpdateMetadata: false,
              hidden: false,
              recorder: false,
              agent: false,
            },
          })
          .catch((error) => console.warn("LIVEKIT_UPDATE_PARTICIPANT_WARN", error));
      }),
  );
}

/** Best-effort, server-originated refresh hint; authorization stays in HTTP APIs. */
export async function broadcastLiveRoomInvalidation(
  sessionId: string,
  resource: "state" | "messages",
) {
  try {
    const client = createRoomServiceClient();
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: "INVALIDATE", resource }),
    );
    await client.sendData(
      getLiveKitRoomName(sessionId),
      payload,
      DataPacket_Kind.RELIABLE,
      { topic: "lms-invalidation" },
    );
  } catch (error) {
    // No connected room is normal for waiting-room joins.
    console.warn("LIVEKIT_INVALIDATION_WARN", error);
  }
}
