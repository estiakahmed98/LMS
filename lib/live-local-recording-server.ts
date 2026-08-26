import { appendFile, mkdir, rename, stat, truncate, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getLiveRoom,
  LiveRoomError,
  requireLiveRoomHost,
} from "@/lib/live-room-server";
import type { LiveRoomPayload } from "@/lib/live-room-types";
import { assertValidTransition, type LiveRecordingState } from "@/lib/live-recording-state-machine";
import { logLiveEvent } from "@/lib/live-observability";

/**
 * Server side of host-browser (local mode) live class recording. The host
 * streams MediaRecorder chunks in order; they are appended to one .webm file
 * under public/uploads/recordings and finalize marks the session COMPLETE.
 *
 * NOT production-safe for multi-instance/serverless deployments: the file
 * lives on local disk, so a request routed to a different instance than the
 * one holding the in-progress file will fail. See .env.example for details
 * and the RecordingStorage extension point this module is built around.
 */

const RECORDINGS_DIR = path.join(process.cwd(), "public", "uploads", "recordings");

// One chunk every ~4s at ~2.6Mbps video + 128kbps audio is ~1.3MB in
// practice; 16MB leaves generous headroom while still bounding worst-case
// memory use per request (tightened from the previous 32MB cap).
const MAX_CHUNK_BYTES = 16 * 1024 * 1024;

// Bounds total recording size/duration so a stuck/runaway upload loop can't
// grow a session's recording without limit.
const MAX_RECORDING_TOTAL_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_RECORDING_CHUNK_COUNT = 5400; // ~6 hours at one chunk/4s

export { MAX_CHUNK_BYTES };

function assertSafeSessionId(sessionId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) {
    throw new LiveRoomError("Invalid session id.", 400);
  }
}

function recordingFileName(sessionId: string) {
  return `live-${sessionId}.webm`;
}

function normalizeRecordingState(value: string | null | undefined): LiveRecordingState {
  switch (value) {
    case "STARTING":
    case "ACTIVE":
    case "ENDING":
    case "COMPLETE":
    case "FAILED":
      return value;
    default:
      return "IDLE";
  }
}

const chunkQueues = new Map<string, Promise<void>>();

/** Serialize local-disk writes for one take so duplicate retries cannot append twice. */
async function withChunkLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = chunkQueues.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  chunkQueues.set(key, current);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (chunkQueues.get(key) === current) chunkQueues.delete(key);
  }
}

export async function appendLiveRecordingChunk(
  sessionId: string,
  seq: number,
  recordingAttemptId: string,
  data: Buffer,
) {
  return withChunkLock(`${sessionId}:${recordingAttemptId}`, () =>
    appendLiveRecordingChunkUnlocked(sessionId, seq, recordingAttemptId, data),
  );
}

async function appendLiveRecordingChunkUnlocked(
  sessionId: string,
  seq: number,
  recordingAttemptId: string,
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

  const state = normalizeRecordingState(row.recordingStatus);
  if (state !== "ACTIVE") {
    throw new LiveRoomError("No active local recording for this session.", 409);
  }

  if (!row.recordingAttemptId || row.recordingAttemptId !== recordingAttemptId) {
    throw new LiveRoomError(
      "This recording attempt is no longer active (a new recording may have started).",
      409,
    );
  }

  const expectedNextSeq = row.recordingLastSeq === null ? 0 : row.recordingLastSeq + 1;
  if (seq > expectedNextSeq) {
    throw new LiveRoomError(`Out-of-order chunk: expected seq ${expectedNextSeq}.`, 409);
  }

  const projectedTotal = Number(row.recordingBytesTotal) + data.length;
  if (projectedTotal > MAX_RECORDING_TOTAL_BYTES || row.recordingChunkCount >= MAX_RECORDING_CHUNK_COUNT) {
    // Quota exceeded: stop accepting chunks and move the session toward
    // ENDING so the client's uploader stops retrying indefinitely.
    if (state === "ACTIVE") {
      await prisma.liveClassSession.update({
        where: { id: sessionId },
        data: { recordingStatus: "ENDING" },
      });
    }
    throw new LiveRoomError("Recording size/duration limit reached.", 413);
  }

  // Duplicate detection: a retried POST for a seq we've already recorded in
  // the ledger is accepted idempotently (no re-write, no error) rather than
  // corrupting the file with a second append.
  if (seq <= (row.recordingLastSeq ?? -1)) {
    const alreadyLogged = await prisma.liveRecordingChunkLog.findUnique({
      where: { recordingAttemptId_seq: { recordingAttemptId, seq } },
    });
    if (alreadyLogged) return;
    // seq is within the already-accepted range but wasn't logged — treat as
    // a stale/mismatched attempt rather than silently appending again.
    throw new LiveRoomError(`Duplicate or stale chunk seq ${seq}.`, 409);
  }

  await mkdir(RECORDINGS_DIR, { recursive: true });
  const filePath = path.join(RECORDINGS_DIR, recordingFileName(sessionId));
  const firstChunkTempPath = `${filePath}.${recordingAttemptId}.tmp`;

  // seq 0 starts a fresh file. Safe to overwrite here because seq 0 is only
  // reachable for the CURRENT recordingAttemptId (checked above) — a stale
  // attempt's seq 0 was already rejected by the attemptId match above, so
  // this can no longer clobber a different, still-active attempt's file.
  const previousSize = seq === 0
    ? 0
    : await stat(filePath).then((value) => value.size).catch(() => 0);
  try {
    await prisma.$transaction([
      prisma.liveRecordingChunkLog.create({
        data: { sessionId, recordingAttemptId, seq, byteLength: data.length },
      }),
      prisma.liveClassSession.update({
        where: { id: sessionId },
        data: {
          recordingLastSeq: seq,
          recordingChunkCount: { increment: 1 },
          recordingBytesTotal: { increment: data.length },
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Another request already reserved the sequence; no file write occurred.
      return;
    }
    throw error;
  }

  try {
    if (seq === 0) {
      await writeFile(firstChunkTempPath, data, { flag: "wx" });
      await rename(firstChunkTempPath, filePath);
    } else {
      await appendFile(filePath, data);
    }
  } catch (error) {
    if (seq === 0) {
      await unlink(firstChunkTempPath).catch(() => undefined);
    } else {
      await truncate(filePath, previousSize).catch(() => undefined);
    }
    // Compensate the durable reservation while the per-attempt lock is held.
    await prisma.$transaction([
      prisma.liveRecordingChunkLog.deleteMany({
        where: { recordingAttemptId, seq },
      }),
      prisma.liveClassSession.updateMany({
        where: { id: sessionId, recordingAttemptId, recordingLastSeq: seq },
        data: {
          recordingLastSeq: seq === 0 ? null : seq - 1,
          recordingChunkCount: { decrement: 1 },
          recordingBytesTotal: { decrement: data.length },
        },
      }),
    ]).catch((rollbackError) => {
      console.error("LOCAL_RECORDING_CHUNK_ROLLBACK_ERROR", rollbackError);
    });
    throw error;
  }

  logLiveEvent({
    requestId: "internal",
    route: "appendLiveRecordingChunk",
    sessionId,
    recordingAttemptId,
    seq,
    status: 200,
  });
}

export async function finalizeLiveRecording(
  sessionId: string,
  failed: boolean,
  recordingAttemptId: string,
): Promise<LiveRoomPayload> {
  assertSafeSessionId(sessionId);
  const { row } = await requireLiveRoomHost(sessionId);
  if (!row.recordingAttemptId || row.recordingAttemptId !== recordingAttemptId) {
    throw new LiveRoomError("This recording attempt is no longer active.", 409);
  }
  const currentState = normalizeRecordingState(row.recordingStatus);

  if (failed) {
    assertValidTransition(currentState, "FAILED");
    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: { recordingStatus: "FAILED", recordingEgressId: null },
    });
    return getLiveRoom(sessionId);
  }

  // Finalize-exactly-once: COMPLETE is terminal, so a second finalize call
  // on an already-finalized session is rejected by the state machine rather
  // than silently re-processing (or re-notifying) it.
  assertValidTransition(currentState, "COMPLETE");

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

  void notifyRecordingReady(sessionId);

  return getLiveRoom(sessionId);
}

async function notifyRecordingReady(sessionId: string) {
  try {
    const { notifyInstructorRecordingReady } = await import("@/lib/notification-server");
    await notifyInstructorRecordingReady(sessionId);
  } catch (error) {
    console.warn("RECORDING_NOTIFICATION_WARN", error);
  }
}
