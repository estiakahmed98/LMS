import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import type {
  AdminRecordingFacets,
  AdminRecordingListFilters,
  AdminRecordingListResult,
  AdminRecordingPayload,
  AdminRecordingSummary,
} from "@/lib/admin-recording-types";
import { Prisma } from "@/lib/generated/prisma/client";
import { parseYouTubeUrl } from "@/lib/youtube";

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
    youtubeUrl: session.youtubeUrl ?? null,
    youtubeVideoId: session.youtubeVideoId ?? null,
    attendeeCount: session.attendances.length,
    createdAt: session.scheduledStart.toISOString(),
  };
}

export async function listRecordings(
  filters: AdminRecordingListFilters = {},
): Promise<AdminRecordingListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 9;

  const andConditions: Prisma.LiveClassSessionWhereInput[] = [];

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    andConditions.push({
      OR: [
        { liveClass: { title: { contains: search, mode: "insensitive" } } },
        { liveClass: { subjectName: { contains: search, mode: "insensitive" } } },
        { liveClass: { batchName: { contains: search, mode: "insensitive" } } },
        { liveClass: { instructor: { name: { contains: search, mode: "insensitive" } } } },
      ],
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    andConditions.push({
      scheduledStart: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lt: new Date(filters.dateTo) } : {}),
      },
    });
  }

  const where: Prisma.LiveClassSessionWhereInput = {
    recordingUrl: { not: null },
    ...(filters.batchName ? { liveClass: { batchName: filters.batchName } } : {}),
    ...(filters.subjectName ? { liveClass: { subjectName: filters.subjectName } } : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const [sessions, total] = await Promise.all([
    prisma.liveClassSession.findMany({
      where,
      include: recordingInclude,
      orderBy: { scheduledStart: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.liveClassSession.count({ where }),
  ]);

  return {
    recordings: sessions.map(serializeRecording),
    total,
    page,
    pageSize,
  };
}

export async function listRecordingFacets(): Promise<AdminRecordingFacets> {
  const [batches, subjects] = await Promise.all([
    prisma.liveClass.findMany({
      where: { sessions: { some: { recordingUrl: { not: null } } } },
      select: { batchName: true },
      distinct: ["batchName"],
      orderBy: { batchName: "asc" },
    }),
    prisma.liveClass.findMany({
      where: { sessions: { some: { recordingUrl: { not: null } } } },
      select: { subjectName: true },
      distinct: ["subjectName"],
      orderBy: { subjectName: "asc" },
    }),
  ]);

  return {
    batchNames: batches.map((b) => b.batchName),
    subjectNames: subjects.map((s) => s.subjectName),
  };
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

  const youtubeUrl = payload.youtubeUrl?.trim() || null;
  let youtubeVideoId: string | null = null;
  if (youtubeUrl) {
    youtubeVideoId = parseYouTubeUrl(youtubeUrl);
    if (!youtubeVideoId) {
      throw new Error("Please enter a valid YouTube video URL.");
    }
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
    youtubeUrl,
    youtubeVideoId,
  };
}

export async function createRecording(
  payload: AdminRecordingPayload,
  actorId: string | null = null,
) {
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
      youtubeUrl: payload.youtubeUrl,
      youtubeVideoId: payload.youtubeVideoId,
    },
    include: recordingInclude,
  });

  await auditLogEntry({
    actorId,
    action: "recording.created",
    entity: "LiveClassSession",
    entityId: session.id,
    changes: payload,
  });

  return serializeRecording(session);
}

export async function updateRecording(
  id: string,
  payload: AdminRecordingPayload,
  actorId: string | null = null,
) {
  const session = await prisma.liveClassSession.update({
    where: { id },
    data: {
      liveClassId: payload.liveClassId,
      scheduledStart: new Date(payload.scheduledStart),
      scheduledEnd: new Date(payload.scheduledEnd),
      recordingUrl: payload.recordingUrl,
      recordingSizeMb: payload.recordingSizeMb,
      youtubeUrl: payload.youtubeUrl,
      youtubeVideoId: payload.youtubeVideoId,
    },
    include: recordingInclude,
  });

  await auditLogEntry({
    actorId,
    action: "recording.updated",
    entity: "LiveClassSession",
    entityId: session.id,
    changes: payload,
  });

  return serializeRecording(session);
}

export async function deleteRecording(id: string, actorId: string | null = null) {
  await prisma.liveClassSession.delete({ where: { id } });

  await auditLogEntry({
    actorId,
    action: "recording.deleted",
    entity: "LiveClassSession",
    entityId: id,
  });
}
