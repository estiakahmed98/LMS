import {
  AccessToken,
  EncodedFileOutput,
  EncodedFileType,
  EgressClient,
  EgressStatus,
  RoomServiceClient,
  S3Upload,
} from "livekit-server-sdk";
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
