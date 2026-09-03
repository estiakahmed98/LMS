import { prisma } from "@/lib/prisma";
import type {
  LearnerLiveClassesPayload,
  LearnerLiveCourse,
  LearnerLiveSession,
} from "@/lib/learner-live-types";
import { EnrollmentStatus } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  LearnerAuthError,
  requireLearner as requireLearnerAccount,
} from "@/lib/learner-auth-server";

export class LearnerLiveError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LearnerLiveError";
    this.status = status;
  }
}

export async function requireLearner() {
  try {
    return await requireLearnerAccount("/live-classes");
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      throw new LearnerLiveError(error.message, error.status);
    }
    throw error;
  }
}

type LearnerLiveScope = "overview" | "calendar" | "recordings" | "attendance";

interface LearnerLiveQuery {
  scope?: string;
  cursor?: string;
  pageSize?: number;
  search?: string;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function safeDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function getLearnerLiveClasses(
  learnerId: string,
  query: LearnerLiveQuery = {},
): Promise<LearnerLiveClassesPayload> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: learnerId,
      status: EnrollmentStatus.APPROVED,
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);

  if (courseIds.length === 0) {
    return {
      courses: [],
      sessions: [],
      pagination: { nextCursor: null, hasMore: false, pageSize: 20 },
    };
  }

  const scope: LearnerLiveScope = [
    "overview",
    "calendar",
    "recordings",
    "attendance",
  ].includes(query.scope ?? "")
    ? (query.scope as LearnerLiveScope)
    : "overview";
  const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 50);
  const dateFrom = safeDate(query.dateFrom);
  const dateTo = safeDate(query.dateTo);
  const search = query.search?.trim().slice(0, 100);

  const visibilityWhere: Prisma.LiveClassWhereInput = {
    courseId: { in: courseIds },
    OR: [
      { batchId: null },
      {
        batch: {
          status: "ACTIVE",
          memberships: { some: { userId: learnerId, status: "ACTIVE" } },
        },
      },
    ],
  };

  const scheduledStart: Prisma.DateTimeFilter = {
    ...(dateFrom ? { gte: dateFrom } : {}),
    ...(dateTo ? { lt: dateTo } : {}),
  };

  const where: Prisma.LiveClassSessionWhereInput = {
    liveClass: {
      AND: [
        visibilityWhere,
        ...(query.courseId && courseIds.includes(query.courseId)
          ? [{ courseId: query.courseId }]
          : []),
        ...(search
          ? [
              {
                OR: [
                  { title: { contains: search, mode: "insensitive" as const } },
                  {
                    subjectName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    course: {
                      title: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                  {
                    instructor: {
                      name: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    },
    ...(dateFrom || dateTo ? { scheduledStart } : {}),
    ...(scope === "recordings"
      ? {
          status: "COMPLETED",
          OR: [
            { recordingUrl: { not: null } },
            { youtubeVideoId: { not: null } },
          ],
        }
      : scope === "attendance"
        ? { status: "COMPLETED" }
        : scope === "overview"
          ? {
              status: { in: ["UPCOMING", "LIVE", "MISSED"] },
              scheduledStart: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            }
          : {}),
  };

  const sessionRows = await prisma.liveClassSession.findMany({
    where,
    include: {
      _count: {
        select: {
          attendances: true,
        },
      },
      liveClass: {
        include: {
          course: { select: { id: true, title: true } },
          instructor: { select: { id: true, name: true } },
        },
      },
      attendances: {
        where: { userId: learnerId },
        take: 1,
      },
    },
    orderBy: [
      { scheduledStart: scope === "overview" || scope === "calendar" ? "asc" : "desc" },
      { id: "asc" },
    ],
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    take: pageSize + 1,
  });

  const hasMore = sessionRows.length > pageSize;
  const visibleRows = hasMore ? sessionRows.slice(0, pageSize) : sessionRows;

  const sessions: LearnerLiveSession[] = visibleRows.map((row) => {
    const mine = row.attendances[0];
    return {
      id: row.id,
      liveClassId: row.liveClassId,
      scheduledStart: row.scheduledStart.toISOString(),
      scheduledEnd: row.scheduledEnd.toISOString(),
      status: row.status,
      recordingUrl: row.recordingUrl,
      youtubeVideoId: row.youtubeVideoId,
      attendeeCount: row._count.attendances,
      liveClass: {
        id: row.liveClass.id,
        title: row.liveClass.title,
        subjectName: row.liveClass.subjectName,
        batchName: row.liveClass.batchName,
        durationMinutes: row.liveClass.durationMinutes,
        courseId: row.liveClass.course.id,
        courseTitle: row.liveClass.course.title,
        instructorId: row.liveClass.instructor.id,
        instructorName: row.liveClass.instructor.name,
      },
      myAttendance: mine
        ? {
            status: mine.status,
            durationMinutes: mine.durationMinutes,
          }
        : null,
    };
  });

  const classCounts = await prisma.liveClass.groupBy({
    by: ["courseId"],
    where: visibilityWhere,
    _count: { _all: true },
  });
  const classCountByCourse = new Map(
    classCounts.map((row) => [row.courseId, row._count._all]),
  );
  const courses: LearnerLiveCourse[] = enrollments.map((enrollment) => ({
    id: enrollment.course.id,
    title: enrollment.course.title,
    description: enrollment.course.description,
    liveClassCount: classCountByCourse.get(enrollment.course.id) ?? 0,
  }));

  return {
    courses,
    sessions,
    pagination: {
      nextCursor: hasMore ? visibleRows.at(-1)?.id ?? null : null,
      hasMore,
      pageSize,
    },
  };
}
