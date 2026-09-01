import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import { buildRecurringSessionTimes } from "@/lib/recurrence-sessions";
import type {
  AdminClassDetail,
  AdminClassCohortOption,
  AdminClassListFilters,
  AdminClassListResult,
  AdminClassOption,
  AdminClassPayload,
  AdminClassStats,
  AdminClassSummary,
} from "@/lib/admin-class-types";
import {
  BatchCourseStatus,
  BatchInstructorRole,
  BatchInstructorStatus,
  BatchStatus,
  LiveClassStatus,
  MeetingType,
  RecurrencePattern,
  Role,
  UserStatus,
} from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

const classListInclude = {
  course: { select: { title: true } },
  instructor: { select: { id: true, name: true, email: true } },
  sessions: {
    select: {
      id: true,
      scheduledStart: true,
      status: true,
      recordingUrl: true,
      attendances: { select: { id: true, status: true } },
    },
  },
} satisfies Prisma.LiveClassInclude;

const classDetailInclude = {
  course: { select: { title: true } },
  instructor: { select: { id: true, name: true, email: true } },
  sessions: {
    include: {
      attendances: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinTime: "asc" },
      },
      chatMessages: { select: { id: true } },
    },
    orderBy: { scheduledStart: "asc" },
  },
} satisfies Prisma.LiveClassInclude;

type ClassListRow = Prisma.LiveClassGetPayload<{ include: typeof classListInclude }>;
type ClassDetailRow = Prisma.LiveClassGetPayload<{ include: typeof classDetailInclude }>;

function computeMetrics(sessions: ClassListRow["sessions"]) {
  const attendanceRows = sessions.flatMap((session) => session.attendances);
  const presentCount = attendanceRows.filter(
    (attendance) => attendance.status === "PRESENT" || attendance.status === "LATE",
  ).length;
  const attendanceRate =
    attendanceRows.length > 0
      ? Math.round((presentCount / attendanceRows.length) * 100)
      : 0;

  const now = Date.now();
  const upcoming = sessions
    .filter((session) => session.scheduledStart.getTime() >= now)
    .sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
  const latest = [...sessions].sort(
    (a, b) => b.scheduledStart.getTime() - a.scheduledStart.getTime(),
  )[0];

  return {
    sessionCount: sessions.length,
    recordingCount: sessions.filter((session) => session.recordingUrl).length,
    attendeeCount: attendanceRows.length,
    attendanceRate,
    chatMessageCount: 0,
    nextSessionStart: upcoming[0]?.scheduledStart.toISOString() ?? null,
    latestSessionStart: latest?.scheduledStart.toISOString() ?? null,
    latestSessionStatus: latest?.status ?? null,
  };
}

function serializeClassSummary(liveClass: ClassListRow): AdminClassSummary {
  const primarySession = [...liveClass.sessions].sort(
    (a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime(),
  )[0];

  return {
    id: liveClass.id,
    title: liveClass.title,
    courseId: liveClass.courseId,
    courseTitle: liveClass.course.title,
    subjectName: liveClass.subjectName,
    instructor: liveClass.instructor,
    batchId: liveClass.batchId,
    batchCourseId: liveClass.batchCourseId,
    batchName: liveClass.batchName,
    status: liveClass.status,
    meetingType: liveClass.meetingType,
    recurrence: liveClass.recurrence,
    durationMinutes: liveClass.durationMinutes,
    meetingLink: liveClass.meetingLink,
    waitingRoomEnabled: liveClass.waitingRoomEnabled,
    recordingEnabled: liveClass.recordingEnabled,
    autoAttendanceEnabled: liveClass.autoAttendanceEnabled,
    scheduledStart: primarySession?.scheduledStart.toISOString() ?? null,
    createdAt: liveClass.createdAt.toISOString(),
    updatedAt: liveClass.updatedAt.toISOString(),
    metrics: computeMetrics(liveClass.sessions),
  };
}

function serializeClassDetail(liveClass: ClassDetailRow): AdminClassDetail {
  const chatMessageCount = liveClass.sessions.reduce(
    (total, session) => total + session.chatMessages.length,
    0,
  );

  const attendance = liveClass.sessions.flatMap((session) =>
    session.attendances.map((attendance) => ({
      id: attendance.id,
      sessionId: session.id,
      sessionScheduledStart: session.scheduledStart.toISOString(),
      userId: attendance.userId,
      userName: attendance.user?.name ?? null,
      status: attendance.status,
      joinTime: attendance.joinTime?.toISOString() ?? null,
      leaveTime: attendance.leaveTime?.toISOString() ?? null,
      durationMinutes: attendance.durationMinutes,
    })),
  );

  return {
    ...serializeClassSummary(liveClass),
    metrics: {
      ...computeMetrics(liveClass.sessions),
      chatMessageCount,
    },
    sessions: liveClass.sessions.map((session) => ({
      id: session.id,
      scheduledStart: session.scheduledStart.toISOString(),
      scheduledEnd: session.scheduledEnd.toISOString(),
      actualStart: session.actualStart?.toISOString() ?? null,
      actualEnd: session.actualEnd?.toISOString() ?? null,
      status: session.status,
      recordingUrl: session.recordingUrl,
      recordingSizeMb: session.recordingSizeMb,
      attendeeCount: session.attendances.length,
      chatMessageCount: session.chatMessages.length,
    })),
    attendance,
  };
}

export async function listClasses(
  filters: AdminClassListFilters = {},
): Promise<AdminClassListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 9;

  const andConditions: Prisma.LiveClassWhereInput[] = [];

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { subjectName: { contains: search, mode: "insensitive" } },
        { batchName: { contains: search, mode: "insensitive" } },
        { instructor: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    andConditions.push({
      sessions: {
        some: {
          scheduledStart: {
            ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
            ...(filters.dateTo ? { lt: new Date(filters.dateTo) } : {}),
          },
        },
      },
    });
  }

  const where: Prisma.LiveClassWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.instructorId ? { instructorId: filters.instructorId } : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const [classes, total] = await Promise.all([
    prisma.liveClass.findMany({
      where,
      include: classListInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.liveClass.count({ where }),
  ]);

  return {
    classes: classes.map(serializeClassSummary),
    total,
    page,
    pageSize,
  };
}

export async function getClassStats(): Promise<AdminClassStats> {
  const [total, live, scheduled, completed, cancelled] = await Promise.all([
    prisma.liveClass.count(),
    prisma.liveClass.count({ where: { status: LiveClassStatus.ACTIVE } }),
    prisma.liveClass.count({ where: { status: LiveClassStatus.SCHEDULED } }),
    prisma.liveClass.count({ where: { status: LiveClassStatus.COMPLETED } }),
    prisma.liveClass.count({ where: { status: LiveClassStatus.CANCELLED } }),
  ]);

  return { total, live, scheduled, completed, cancelled };
}

export async function listClassOptions(): Promise<AdminClassOption[]> {
  const classes = await prisma.liveClass.findMany({
    select: { id: true, title: true, batchName: true, subjectName: true },
    orderBy: { createdAt: "desc" },
  });

  return classes;
}

export async function getClassDetail(classId: string) {
  const liveClass = await prisma.liveClass.findUnique({
    where: { id: classId },
    include: classDetailInclude,
  });

  return liveClass ? serializeClassDetail(liveClass) : null;
}

export function normalizeClassPayload(input: unknown): AdminClassPayload {
  const payload = (input ?? {}) as Partial<AdminClassPayload>;
  const durationMinutes = Number(payload.durationMinutes);
  const normalizedStatus = String(payload.status ?? "").toUpperCase();
  const normalizedMeetingType = String(payload.meetingType ?? "").toUpperCase();
  const normalizedRecurrence = String(payload.recurrence ?? "").toUpperCase();
  const batchId = payload.batchId?.trim() || null;
  const batchCourseId = payload.batchCourseId?.trim() || null;

  if (!payload.title?.trim()) {
    throw new Error("Class title is required.");
  }
  if (!payload.courseId?.trim()) {
    throw new Error("Course is required.");
  }
  if (!payload.instructorId?.trim()) {
    throw new Error("Instructor is required.");
  }
  if (!batchCourseId && !payload.batchName?.trim()) {
    throw new Error("Cohort is required.");
  }
  if (!payload.meetingLink?.trim()) {
    throw new Error("Meeting link is required.");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    throw new Error("Duration must be at least 5 minutes.");
  }
  if (!payload.scheduledStart?.trim()) {
    throw new Error("Class date and time are required.");
  }
  const scheduledStartDate = new Date(payload.scheduledStart);
  if (Number.isNaN(scheduledStartDate.getTime())) {
    throw new Error("Invalid class date and time.");
  }
  if (!Object.values(LiveClassStatus).includes(normalizedStatus as LiveClassStatus)) {
    throw new Error("Invalid class status.");
  }
  if (
    !Object.values(MeetingType).includes(normalizedMeetingType as MeetingType)
  ) {
    throw new Error("Invalid meeting type.");
  }
  if (
    !Object.values(RecurrencePattern).includes(
      normalizedRecurrence as RecurrencePattern,
    )
  ) {
    throw new Error("Invalid recurrence pattern.");
  }

  return {
    title: payload.title.trim(),
    courseId: payload.courseId.trim(),
    subjectName: payload.subjectName?.trim() || payload.title.trim(),
    instructorId: payload.instructorId.trim(),
    batchId,
    batchCourseId,
    batchName: payload.batchName?.trim() ?? "",
    status: normalizedStatus as AdminClassPayload["status"],
    meetingType: normalizedMeetingType as AdminClassPayload["meetingType"],
    recurrence: normalizedRecurrence as AdminClassPayload["recurrence"],
    durationMinutes: Math.round(durationMinutes),
    meetingLink: payload.meetingLink.trim(),
    waitingRoomEnabled: Boolean(payload.waitingRoomEnabled),
    recordingEnabled: Boolean(payload.recordingEnabled),
    autoAttendanceEnabled: Boolean(payload.autoAttendanceEnabled),
    scheduledStart: scheduledStartDate.toISOString(),
  };
}

const TEACHING_ROLES = [BatchInstructorRole.LEAD, BatchInstructorRole.ASSISTANT] as const;

export async function listLiveClassCohortOptions(
  instructorId?: string,
): Promise<AdminClassCohortOption[]> {
  const rows = await prisma.batchCourse.findMany({
    where: {
      status: BatchCourseStatus.ACTIVE,
      batch: { status: BatchStatus.ACTIVE },
      instructorAssignments: {
        some: {
          ...(instructorId ? { instructorId } : {}),
          status: BatchInstructorStatus.ACTIVE,
          role: { in: [...TEACHING_ROLES] },
          instructor: {
            role: Role.INSTRUCTOR,
            status: { in: [UserStatus.ACTIVE, UserStatus.APPROVED] },
          },
        },
      },
    },
    include: {
      batch: { select: { id: true, code: true, name: true } },
      course: { select: { id: true, title: true } },
      instructorAssignments: {
        where: {
          status: BatchInstructorStatus.ACTIVE,
          role: { in: [...TEACHING_ROLES] },
          instructor: {
            role: Role.INSTRUCTOR,
            status: { in: [UserStatus.ACTIVE, UserStatus.APPROVED] },
          },
        },
        include: {
          instructor: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: [{ batch: { name: "asc" } }, { course: { title: "asc" } }],
  });

  return rows.map((row) => {
    const instructors = new Map<string, AdminClassCohortOption["instructors"][number]>();
    for (const assignment of row.instructorAssignments) {
      const current = instructors.get(assignment.instructorId);
      if (current) {
        current.roles.push(assignment.role as "LEAD" | "ASSISTANT");
      } else {
        instructors.set(assignment.instructorId, {
          ...assignment.instructor,
          roles: [assignment.role as "LEAD" | "ASSISTANT"],
        });
      }
    }
    return {
      batchId: row.batch.id,
      batchCourseId: row.id,
      code: row.batch.code,
      name: row.batch.name,
      courseId: row.course.id,
      courseTitle: row.course.title,
      instructors: [...instructors.values()],
    };
  });
}

async function resolveClassScope(
  payload: AdminClassPayload,
  instructorId: string,
  allowLegacy: boolean,
) {
  if (!payload.batchCourseId) {
    if (allowLegacy && payload.batchName) {
      return { batchId: null, batchCourseId: null, batchName: payload.batchName };
    }
    throw new Error("Select an active cohort course for this live class.");
  }
  const mapping = await prisma.batchCourse.findFirst({
    where: {
      id: payload.batchCourseId,
      courseId: payload.courseId,
      status: BatchCourseStatus.ACTIVE,
      batch: { status: BatchStatus.ACTIVE },
      instructorAssignments: {
        some: {
          instructorId,
          status: BatchInstructorStatus.ACTIVE,
          role: { in: [...TEACHING_ROLES] },
          instructor: {
            role: Role.INSTRUCTOR,
            status: { in: [UserStatus.ACTIVE, UserStatus.APPROVED] },
          },
        },
      },
    },
    include: { batch: { select: { id: true, name: true } } },
  });
  if (!mapping || (payload.batchId && payload.batchId !== mapping.batchId)) {
    throw new Error("The selected instructor is not mapped to teach this cohort course.");
  }
  return {
    batchId: mapping.batchId,
    batchCourseId: mapping.id,
    batchName: mapping.batch.name,
  };
}

export async function createClass(payload: AdminClassPayload, actorId: string | null) {
  const { scheduledStart, ...classData } = payload;
  const scope = await resolveClassScope(payload, payload.instructorId, false);
  const scheduledStartDate = new Date(scheduledStart);
  const sessionTimes = buildRecurringSessionTimes({
    recurrence: payload.recurrence,
    scheduledStart: scheduledStartDate,
    durationMinutes: payload.durationMinutes,
  });

  const liveClass = await prisma.liveClass.create({
    data: {
      ...classData,
      ...scope,
      sessions: {
        createMany: {
          data: sessionTimes.map((session) => ({
            scheduledStart: session.scheduledStart,
            scheduledEnd: session.scheduledEnd,
          })),
        },
      },
    },
    include: classDetailInclude,
  });

  await auditLogEntry({
    actorId,
    action: "class.created",
    entity: "LiveClass",
    entityId: liveClass.id,
    changes: payload,
  });

  return serializeClassDetail(liveClass);
}

export async function updateClass(
  classId: string,
  payload: AdminClassPayload,
  actorId: string | null,
  options?: { ownerInstructorId?: string },
) {
  const { scheduledStart, ...classData } = payload;
  const scheduledStartDate = new Date(scheduledStart);
  const scheduledEndDate = new Date(
    scheduledStartDate.getTime() + payload.durationMinutes * 60_000,
  );

  if (options?.ownerInstructorId) {
    // Never allow an instructor-scoped update to transfer class ownership.
    classData.instructorId = options.ownerInstructorId;
  }

  const existingClass = await prisma.liveClass.findFirst({
    where: {
      id: classId,
      ...(options?.ownerInstructorId ? { instructorId: options.ownerInstructorId } : {}),
    },
    select: { id: true, batchCourseId: true },
  });
  if (!existingClass) throw new Error("Class not found.");
  const scope = await resolveClassScope(
    payload,
    options?.ownerInstructorId ?? classData.instructorId,
    !existingClass.batchCourseId,
  );

  const existingSessions = await prisma.liveClassSession.findMany({
    where: {
      liveClassId: classId,
      ...(options?.ownerInstructorId
        ? { liveClass: { instructorId: options.ownerInstructorId } }
        : {}),
    },
    orderBy: { scheduledStart: "asc" },
  });
  const primarySession = existingSessions[0];

  const liveClass = await prisma.liveClass.update({
    where: {
      id: classId,
      ...(options?.ownerInstructorId
        ? { instructorId: options.ownerInstructorId }
        : {}),
    },
    data: {
      ...classData,
      ...scope,
      sessions: primarySession
        ? {
            update: {
              where: { id: primarySession.id },
              data: {
                scheduledStart: scheduledStartDate,
                scheduledEnd: scheduledEndDate,
              },
            },
          }
        : {
            create: {
              scheduledStart: scheduledStartDate,
              scheduledEnd: scheduledEndDate,
            },
          },
    },
    include: classDetailInclude,
  });

  if (payload.recurrence !== "NONE" && existingSessions.length <= 1) {
    const additionalTimes = buildRecurringSessionTimes({
      recurrence: payload.recurrence,
      scheduledStart: scheduledStartDate,
      durationMinutes: payload.durationMinutes,
    }).slice(1);

    if (additionalTimes.length > 0) {
      await prisma.liveClassSession.createMany({
        data: additionalTimes.map((session) => ({
          liveClassId: classId,
          scheduledStart: session.scheduledStart,
          scheduledEnd: session.scheduledEnd,
        })),
      });
    }
  }

  await auditLogEntry({
    actorId,
    action: "class.updated",
    entity: "LiveClass",
    entityId: liveClass.id,
    changes: payload,
  });

  const refreshed = await prisma.liveClass.findUniqueOrThrow({
    where: { id: classId },
    include: classDetailInclude,
  });

  return serializeClassDetail(refreshed);
}

export async function deleteClass(
  classId: string,
  actorId: string | null,
  options?: { ownerInstructorId?: string },
) {
  if (options?.ownerInstructorId) {
    const result = await prisma.liveClass.deleteMany({
      where: { id: classId, instructorId: options.ownerInstructorId },
    });
    if (result.count === 0) {
      throw new Error("Class not found.");
    }
  } else {
    await prisma.liveClass.delete({ where: { id: classId } });
  }

  await auditLogEntry({
    actorId,
    action: "class.deleted",
    entity: "LiveClass",
    entityId: classId,
  });
}
