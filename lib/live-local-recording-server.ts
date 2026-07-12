import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  getLiveRoom,
  LiveRoomError,
  requireLiveRoomHost,
} from "@/lib/live-room-server";
import type { LiveRoomPayload } from "@/lib/live-room-types";

/**
 * Server side of host-browser (local mode) live class recording. The host
 * streams MediaRecorder chunks in order; they are appended to one .webm file
 * under public/uploads/recordings and finalize marks the session COMPLETE.
 */

const RECORDINGS_DIR = path.join(process.cwd(), "public", "uploads", "recordings");

// One chunk every ~4s at ~2.6Mbps stays well under this; reject anomalies.
const MAX_CHUNK_BYTES = 32 * 1024 * 1024;

function assertSafeSessionId(sessionId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    throw new LiveRoomError("Invalid session id.", 400);
  }
}

function recordingFileName(sessionId: string) {
  return `live-${sessionId}.webm`;
}

export async function appendLiveRecordingChunk(
  sessionId: string,
  seq: number,
  data: Buffer,
) {
  assertSafeSessionId(sessionId);
  const { row } = await requireLiveRoomHost(sessionId);

  if (row.recordingEgressId) {
    throw new LiveRoomError("A cloud recording is active for this session.", 409);
  }
  if (data.length === 0) {
    throw new LiveRoomError("Empty recording chunk.", 400);
  }
  if (data.length > MAX_CHUNK_BYTES) {
    throw new LiveRoomError("Recording chunk is too large.", 413);
  }

  await mkdir(RECORDINGS_DIR, { recursive: true });
  const filePath = path.join(RECORDINGS_DIR, recordingFileName(sessionId));

  // seq 0 starts a fresh file (also overwrites a previous take of this session).
  if (seq === 0) {
    await writeFile(filePath, data);
  } else {
    await appendFile(filePath, data);
  }
}

export async function finalizeLiveRecording(
  sessionId: string,
  failed = false,
): Promise<LiveRoomPayload> {
  assertSafeSessionId(sessionId);
  await requireLiveRoomHost(sessionId);

  if (failed) {
    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: { recordingStatus: "FAILED", recordingEgressId: null },
    });
    return getLiveRoom(sessionId);
  }

  const fileName = recordingFileName(sessionId);
  let sizeBytes: number;
  try {
    sizeBytes = (await stat(path.join(RECORDINGS_DIR, fileName))).size;
  } catch {
    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: { recordingStatus: "FAILED", recordingEgressId: null },
    });
    throw new LiveRoomError("Recording file was never uploaded.", 400);
  }

  await prisma.liveClassSession.update({
    where: { id: sessionId },
    data: {
      recordingStatus: "COMPLETE",
      recordingUrl: `/uploads/recordings/${fileName}`,
      recordingSizeMb: Math.round((sizeBytes / (1024 * 1024)) * 10) / 10,
      recordingEgressId: null,
    },
  });

  return getLiveRoom(sessionId);
}
