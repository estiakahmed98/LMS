import { prisma } from "@/lib/prisma";
import type {
  AdminRecordingFacets,
  AdminRecordingListFilters,
  AdminRecordingListResult,
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
    youtubeUrl: session.youtubeUrl ?? null,
    youtubeVideoId: session.youtubeVideoId ?? null,
    attendeeCount: session.attendances.length,
    createdAt: session.scheduledStart.toISOString(),
  };
}

// Same bounded, indexed, server-filtered pattern as admin-recording-server's
// listRecordings — a fixed page size and a DB-side count, so this stays fast
// whether the instructor has taught for one term or ten years, regardless of
// how many sessions/recordings pile up.
export async function listInstructorRecordings(
  instructorId: string,
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
    liveClass: { instructorId },
    ...(filters.batchName ? { liveClass: { instructorId, batchName: filters.batchName } } : {}),
    ...(filters.subjectName
      ? { liveClass: { instructorId, subjectName: filters.subjectName } }
      : {}),
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

export async function listInstructorRecordingFacets(
  instructorId: string,
): Promise<AdminRecordingFacets> {
  const [batches, subjects] = await Promise.all([
    prisma.liveClass.findMany({
      where: { instructorId, sessions: { some: { recordingUrl: { not: null } } } },
      select: { batchName: true },
      distinct: ["batchName"],
      orderBy: { batchName: "asc" },
    }),
    prisma.liveClass.findMany({
      where: { instructorId, sessions: { some: { recordingUrl: { not: null } } } },
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
