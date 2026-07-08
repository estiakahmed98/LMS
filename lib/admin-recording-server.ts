import { prisma } from "@/lib/prisma";
import type {
  AdminRecordingPayload,
  AdminRecordingSummary,
} from "@/lib/admin-recording-types";
import { Prisma } from "@/lib/generated/prisma/client";

const recordingInclude = {
  liveClass: {
    select: {
      id: true,
      title: true,
      courseId: true,
      subjectName: true,
      batchName: true,
      course: { select: { title: true } },
      instructor: { select: { id: true, name: true, email: true } },
    },
  },
  attendances: { select: { id: true } },
} satisfies Prisma.LiveClassSessionInclude;

type RecordingRow = Prisma.LiveClassSessionGetPayload<{
  include: typeof recordingInclude;
}>;

function serializeRecording(session: RecordingRow): AdminRecordingSummary {
  return {
    id: session.id,
    liveClassId: session.liveClassId,
    classTitle: session.liveClass.title,
    courseId: session.liveClass.courseId,
    courseTitle: session.liveClass.course.title,
    subjectName: session.liveClass.subjectName,
    batchName: session.liveClass.batchName,
    instructor: session.liveClass.instructor,
    scheduledStart: session.scheduledStart.toISOString(),
    scheduledEnd: session.scheduledEnd.toISOString(),
    status: session.status,
    recordingUrl: session.recordingUrl ?? "",
    recordingSizeMb: session.recordingSizeMb,
    attendeeCount: session.attendances.length,
    createdAt: session.scheduledStart.toISOString(),
  };
}

export async function listRecordings() {
  const sessions = await prisma.liveClassSession.findMany({
    where: { recordingUrl: { not: null } },
    include: recordingInclude,
    orderBy: { scheduledStart: "desc" },
  });

  return sessions.map(serializeRecording);
}

export async function getRecording(id: string) {
  const session = await prisma.liveClassSession.findUnique({
    where: { id },
    include: recordingInclude,
  });

  return session?.recordingUrl ? serializeRecording(session) : null;
}

export function normalizeRecordingPayload(input: unknown): AdminRecordingPayload {
  const payload = (input ?? {}) as Partial<AdminRecordingPayload>;

  if (!payload.liveClassId?.trim()) {
    throw new Error("Class is required.");
  }
  if (!payload.recordingUrl?.trim()) {
    throw new Error("Recording URL is required.");
  }
  const scheduledStart = payload.scheduledStart ? new Date(payload.scheduledStart) : null;
  const scheduledEnd = payload.scheduledEnd ? new Date(payload.scheduledEnd) : null;
  if (!scheduledStart || Number.isNaN(scheduledStart.getTime())) {
    throw new Error("A valid session date is required.");
  }
  if (!scheduledEnd || Number.isNaN(scheduledEnd.getTime())) {
    throw new Error("A valid session end time is required.");
  }
  if (scheduledEnd.getTime() <= scheduledStart.getTime()) {
    throw new Error("Session end time must be after the start time.");
  }

  const recordingSizeMb =
    payload.recordingSizeMb === null || payload.recordingSizeMb === undefined
      ? null
      : Number(payload.recordingSizeMb);
  if (recordingSizeMb !== null && (!Number.isFinite(recordingSizeMb) || recordingSizeMb < 0)) {
    throw new Error("Recording size must be a non-negative number.");
  }

  return {
    liveClassId: payload.liveClassId.trim(),
    scheduledStart: scheduledStart.toISOString(),
    scheduledEnd: scheduledEnd.toISOString(),
    recordingUrl: payload.recordingUrl.trim(),
    recordingSizeMb,
  };
}

export async function createRecording(payload: AdminRecordingPayload) {
  const session = await prisma.liveClassSession.create({
    data: {
      liveClassId: payload.liveClassId,
      scheduledStart: new Date(payload.scheduledStart),
      scheduledEnd: new Date(payload.scheduledEnd),
      actualStart: new Date(payload.scheduledStart),
      actualEnd: new Date(payload.scheduledEnd),
      status: "COMPLETED",
      recordingUrl: payload.recordingUrl,
      recordingSizeMb: payload.recordingSizeMb,
    },
    include: recordingInclude,
  });

  return serializeRecording(session);
}

export async function updateRecording(id: string, payload: AdminRecordingPayload) {
  const session = await prisma.liveClassSession.update({
    where: { id },
    data: {
      liveClassId: payload.liveClassId,
      scheduledStart: new Date(payload.scheduledStart),
      scheduledEnd: new Date(payload.scheduledEnd),
      recordingUrl: payload.recordingUrl,
      recordingSizeMb: payload.recordingSizeMb,
    },
    include: recordingInclude,
  });

  return serializeRecording(session);
}

export async function deleteRecording(id: string) {
  await prisma.liveClassSession.delete({ where: { id } });
}
