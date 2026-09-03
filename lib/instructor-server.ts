import { auth } from "@/auth";
import {
  createClass,
  deleteClass,
  normalizeClassPayload,
  updateClass,
} from "@/lib/admin-class-server";
import type { AdminClassDetail } from "@/lib/admin-class-types";
import { prisma } from "@/lib/prisma";
import type {
  InstructorClassEditPayload,
  InstructorCreateClassPayload,
  InstructorProfileUpdateInput,
} from "@/lib/instructor-class-types";
import type {
  InstructorAttendanceRow,
  InstructorAttendanceSummary,
  InstructorDashboardPayload,
  InstructorParticipantsPayload,
  InstructorSession,
} from "@/lib/instructor-types";
import {
  listInstructorAssignedCourseIds,
  listInstructorAssignedCourses,
} from "@/lib/instructor-course-access";
import {
  canInstructorUseCourse,
  isActiveAccountStatus,
  isInstructorRole,
} from "@/lib/portal-access";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { decryptOptional, encryptOptional } from "@/lib/security/encryption";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  LiveClassStatus,
  PermissionModule,
  SessionStatus,
} from "@/lib/generated/prisma/enums";
import {
  assertRolePermission,
  RbacError,
  type PermissionAction,
} from "@/lib/rbac";

const sessionInclude = {
  liveClass: {
    select: {
      id: true,
      title: true,
      subjectName: true,
      batchName: true,
      durationMinutes: true,
      meetingLink: true,
      instructorId: true,
      course: { select: { title: true } },
    },
  },
  attendances: { select: { id: true } },
} satisfies Prisma.LiveClassSessionInclude;

type SessionRow = Prisma.LiveClassSessionGetPayload<{ include: typeof sessionInclude }>;

const participantSessionInclude = {
  liveClass: {
    select: {
      id: true,
      title: true,
      subjectName: true,
      batchName: true,
      durationMinutes: true,
      meetingLink: true,
      course: { select: { title: true } },
    },
  },
  _count: { select: { attendances: true } },
} satisfies Prisma.LiveClassSessionInclude;

type ParticipantSessionRow = Prisma.LiveClassSessionGetPayload<{
  include: typeof participantSessionInclude;
}>;

const PARTICIPANT_HISTORY_YEARS = 10;
const DEFAULT_ATTENDANCE_PAGE_SIZE = 50;
const MAX_ATTENDANCE_PAGE_SIZE = 100;
const DEFAULT_SESSION_PAGE_SIZE = 50;
const MAX_SESSION_PAGE_SIZE = 100;

function participantCutoff() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - PARTICIPANT_HISTORY_YEARS);
  return cutoff;
}

function positiveInteger(value: number | undefined, fallback: number, maximum?: number) {
  if (!Number.isInteger(value) || (value ?? 0) < 1) return fallback;
  return maximum ? Math.min(value!, maximum) : value!;
}

function pagination(page: number, pageSize: number, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { page: Math.min(page, totalPages), pageSize, total, totalPages };
}

function serializeParticipantSession(row: ParticipantSessionRow): InstructorSession {
  return {
    id: row.id,
    liveClassId: row.liveClassId,
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    actualStart: row.actualStart?.toISOString() ?? null,
    actualEnd: row.actualEnd?.toISOString() ?? null,
    status: row.status,
    recordingUrl: row.recordingUrl,
    attendeeCount: row._count.attendances,
    liveClass: {
      id: row.liveClass.id,
      title: row.liveClass.title,
      subjectName: row.liveClass.subjectName,
      batchName: row.liveClass.batchName,
      durationMinutes: row.liveClass.durationMinutes,
      meetingLink: row.liveClass.meetingLink,
      courseTitle: row.liveClass.course.title,
    },
  };
}

export class InstructorAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "InstructorAuthError";
    this.status = status;
  }
}

export async function requireInstructor(
  permission: {
    module: PermissionModule;
    action: PermissionAction;
  } | null = { module: PermissionModule.COURSES, action: "view" },
) {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) {
    throw new InstructorAuthError("You must be signed in.", 401);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (!currentUser) {
    throw new InstructorAuthError("You must be signed in.", 401);
  }

  if (!isActiveAccountStatus(currentUser.status)) {
    throw new InstructorAuthError("This account is not active.", 403);
  }

  if (!isInstructorRole(currentUser.role)) {
    throw new InstructorAuthError("Instructor access required.", 403);
  }

  if (permission) {
    try {
      await assertRolePermission(
        currentUser.role,
        permission.module,
        permission.action,
      );
    } catch (error) {
      if (error instanceof RbacError) {
        throw new InstructorAuthError(error.message, error.status);
      }
      throw error;
    }
  }

  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: "INSTRUCTOR" as const,
  };
}

function serializeSession(row: SessionRow): InstructorSession {
  return {
    id: row.id,
    liveClassId: row.liveClassId,
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    actualStart: row.actualStart?.toISOString() ?? null,
    actualEnd: row.actualEnd?.toISOString() ?? null,
    status: row.status,
    recordingUrl: row.recordingUrl,
    attendeeCount: row.attendances.length,
    liveClass: {
      id: row.liveClass.id,
      title: row.liveClass.title,
      subjectName: row.liveClass.subjectName,
      batchName: row.liveClass.batchName,
      durationMinutes: row.liveClass.durationMinutes,
      meetingLink: row.liveClass.meetingLink,
      courseTitle: row.liveClass.course.title,
    },
  };
}

export async function listInstructorSessions(
  instructorId: string,
): Promise<InstructorSession[]> {
  const rows = await prisma.liveClassSession.findMany({
    where: { liveClass: { instructorId } },
    include: sessionInclude,
    orderBy: { scheduledStart: "asc" },
  });

  return rows.map(serializeSession);
}

const RECENT_LIST_LIMIT = 5;
const STARTING_SOON_WINDOW_MS = 15 * 60 * 1000;

/**
 * Bounded, purpose-built payload for /instructor/dashboard. Unlike
 * listInstructorSessions (which returns an instructor's entire session
 * history with no limit — fine for a one-off export, not for a page loaded
 * on every visit), this only ever fetches small, indexed slices: today's
 * sessions, the next few upcoming, the last few completed, and DB-side
 * counts for the stat cards. Response size stays flat whether the
 * instructor has taught for one term or ten years.
 */
export async function getInstructorDashboard(
  instructorId: string,
): Promise<InstructorDashboardPayload> {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startingSoonCutoff = new Date(now.getTime() + STARTING_SOON_WINDOW_MS);

  const baseWhere = { liveClass: { instructorId } };

  const [
    todayCount,
    upcomingCount,
    completedCount,
    liveCount,
    liveSessions,
    startingSoonSessions,
    todaySessions,
    upcomingSessions,
    recentCompletedSessions,
  ] = await Promise.all([
    prisma.liveClassSession.count({
      where: { ...baseWhere, scheduledStart: { gte: startOfToday, lt: startOfTomorrow } },
    }),
    prisma.liveClassSession.count({
      where: { ...baseWhere, status: SessionStatus.UPCOMING, scheduledStart: { gt: now } },
    }),
    prisma.liveClassSession.count({
      where: { ...baseWhere, status: SessionStatus.COMPLETED },
    }),
    prisma.liveClassSession.count({
      where: { ...baseWhere, status: SessionStatus.LIVE },
    }),
    prisma.liveClassSession.findMany({
      where: { ...baseWhere, status: SessionStatus.LIVE },
      include: sessionInclude,
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.liveClassSession.findMany({
      where: {
        ...baseWhere,
        status: SessionStatus.UPCOMING,
        scheduledStart: { gt: now, lte: startingSoonCutoff },
      },
      include: sessionInclude,
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.liveClassSession.findMany({
      where: { ...baseWhere, scheduledStart: { gte: startOfToday, lt: startOfTomorrow } },
      include: sessionInclude,
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.liveClassSession.findMany({
      where: { ...baseWhere, status: SessionStatus.UPCOMING, scheduledStart: { gt: now } },
      include: sessionInclude,
      orderBy: { scheduledStart: "asc" },
      take: RECENT_LIST_LIMIT,
    }),
    prisma.liveClassSession.findMany({
      where: { ...baseWhere, status: SessionStatus.COMPLETED },
      include: sessionInclude,
      orderBy: { scheduledStart: "desc" },
      take: RECENT_LIST_LIMIT,
    }),
  ]);

  return {
    stats: { todayCount, upcomingCount, completedCount, liveCount },
    liveSessions: liveSessions.map(serializeSession),
    startingSoonSessions: startingSoonSessions.map(serializeSession),
    todaySessions: todaySessions.map(serializeSession),
    upcomingSessions: upcomingSessions.map(serializeSession),
    recentCompletedSessions: recentCompletedSessions.map(serializeSession),
  };
}

export async function listInstructorClasses(instructorId: string) {
  const classes = await prisma.liveClass.findMany({
    where: { instructorId },
    include: {
      course: { select: { title: true } },
      sessions: {
        include: sessionInclude,
        orderBy: { scheduledStart: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return classes.map((liveClass) => ({
    id: liveClass.id,
    title: liveClass.title,
    subjectName: liveClass.subjectName,
    batchName: liveClass.batchName,
    durationMinutes: liveClass.durationMinutes,
    meetingLink: liveClass.meetingLink,
    courseTitle: liveClass.course.title,
    sessions: liveClass.sessions.map(serializeSession),
  }));
}

export async function getInstructorParticipants(
  instructorId: string,
  options: {
    sessionId?: string | null;
    page?: number;
    pageSize?: number;
    sessionPage?: number;
    sessionPageSize?: number;
    liveClassId?: string;
    group?: string;
    student?: string;
    includeFilters?: boolean;
  } = {},
): Promise<InstructorParticipantsPayload> {
  const cutoff = participantCutoff();
  const requestedPage = positiveInteger(options.page, 1);
  const pageSize = positiveInteger(
    options.pageSize,
    DEFAULT_ATTENDANCE_PAGE_SIZE,
    MAX_ATTENDANCE_PAGE_SIZE,
  );
  const requestedSessionPage = positiveInteger(options.sessionPage, 1);
  const sessionPageSize = positiveInteger(
    options.sessionPageSize,
    DEFAULT_SESSION_PAGE_SIZE,
    MAX_SESSION_PAGE_SIZE,
  );
  const liveClassWhere: Prisma.LiveClassWhereInput = {
    instructorId,
    ...(options.liveClassId ? { id: options.liveClassId } : {}),
    ...(options.group ? { batchName: options.group } : {}),
  };
  const sessionWhere: Prisma.LiveClassSessionWhereInput = {
    liveClass: liveClassWhere,
    status: { in: [SessionStatus.COMPLETED, SessionStatus.LIVE] },
    scheduledStart: { gte: cutoff },
  };

  const [sessionTotal, filterClassRows] = await Promise.all([
    prisma.liveClassSession.count({ where: sessionWhere }),
    options.includeFilters === false ? Promise.resolve([]) : prisma.liveClass.findMany({
      where: {
        instructorId,
        sessions: {
          some: {
            status: { in: [SessionStatus.COMPLETED, SessionStatus.LIVE] },
            scheduledStart: { gte: cutoff },
          },
        },
      },
      select: { id: true, title: true, batchName: true },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      take: 1000,
    }),
  ]);
  const filters = {
    classes: filterClassRows.map((row) => ({ id: row.id, title: row.title })),
    groups: [...new Set(filterClassRows.map((row) => row.batchName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
  };
  const sessionMeta = pagination(
    requestedSessionPage,
    sessionPageSize,
    sessionTotal,
  );
  const sessionRows = await prisma.liveClassSession.findMany({
    where: sessionWhere,
    include: participantSessionInclude,
    orderBy: [{ scheduledStart: "desc" }, { id: "desc" }],
    skip: (sessionMeta.page - 1) * sessionMeta.pageSize,
    take: sessionMeta.pageSize,
  });
  const sessions = sessionRows.map(serializeParticipantSession);

  let selectedSessionId = options.sessionId || sessions[0]?.id || null;
  if (options.sessionId) {
    const ownedSession = await prisma.liveClassSession.findFirst({
      where: { ...sessionWhere, id: options.sessionId },
      select: { id: true },
    });
    if (!ownedSession) throw new InstructorAuthError("Session not found.", 404);
    selectedSessionId = ownedSession.id;
  }

  if (!selectedSessionId) {
    return {
      sessions,
      attendance: [],
      selectedSessionId: null,
      ...(options.includeFilters === false ? {} : { filters }),
      pagination: pagination(1, pageSize, 0),
      sessionPagination: sessionMeta,
      range: { years: PARTICIPANT_HISTORY_YEARS, from: cutoff.toISOString() },
    };
  }

  const student = options.student?.trim();
  const attendanceWhere: Prisma.LiveClassAttendanceWhereInput = {
    sessionId: selectedSessionId,
    ...(student
      ? {
          user: {
            OR: [
              { name: { contains: student, mode: "insensitive" } },
              { email: { contains: student, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };
  const attendanceTotal = await prisma.liveClassAttendance.count({
    where: attendanceWhere,
  });
  const attendanceMeta = pagination(requestedPage, pageSize, attendanceTotal);
  const attendanceRows = await prisma.liveClassAttendance.findMany({
    where: attendanceWhere,
    include: { user: { select: { id: true, name: true } } },
    orderBy: [{ joinTime: "asc" }, { id: "asc" }],
    skip: (attendanceMeta.page - 1) * attendanceMeta.pageSize,
    take: attendanceMeta.pageSize,
  });

  const attendance: InstructorAttendanceRow[] = attendanceRows.map((row) => ({
    id: row.id,
    sessionId: row.sessionId,
    userId: row.userId,
    userName: row.user.name,
    status: row.status,
    joinTime: row.joinTime?.toISOString() ?? null,
    leaveTime: row.leaveTime?.toISOString() ?? null,
    durationMinutes: row.durationMinutes,
    speakTimeSeconds: row.speakTimeSeconds,
  }));

  return {
    sessions,
    attendance,
    selectedSessionId,
    ...(options.includeFilters === false ? {} : { filters }),
    pagination: attendanceMeta,
    sessionPagination: sessionMeta,
    range: { years: PARTICIPANT_HISTORY_YEARS, from: cutoff.toISOString() },
  };
}

export async function getInstructorAttendanceSummary(
  instructorId: string,
): Promise<InstructorAttendanceSummary> {
  const cutoff = participantCutoff();
  const sessionWhere: Prisma.LiveClassSessionWhereInput = {
    liveClass: { instructorId },
    status: { in: [SessionStatus.COMPLETED, SessionStatus.LIVE] },
    scheduledStart: { gte: cutoff },
  };
  const attendanceWhere: Prisma.LiveClassAttendanceWhereInput = {
    session: sessionWhere,
  };
  const [sessionGroups, attendanceGroups, classRows] = await Promise.all([
    prisma.liveClassSession.groupBy({
      by: ["status"],
      where: sessionWhere,
      _count: { _all: true },
    }),
    prisma.liveClassAttendance.groupBy({
      by: ["status"],
      where: attendanceWhere,
      _count: { _all: true },
    }),
    prisma.$queryRaw<
      Array<{
        liveClassId: string;
        title: string;
        batchName: string;
        sessionsHeld: bigint;
        attendeeTotal: bigint;
        presentTotal: bigint;
      }>
    >(Prisma.sql`
      SELECT lc.id AS "liveClassId", lc.title, lc."batchName",
        COUNT(DISTINCT s.id)::bigint AS "sessionsHeld",
        COUNT(a.id)::bigint AS "attendeeTotal",
        COUNT(a.id) FILTER (WHERE a.status IN ('PRESENT', 'LATE'))::bigint AS "presentTotal"
      FROM live_classes lc
      JOIN live_class_sessions s ON s."liveClassId" = lc.id
      LEFT JOIN live_class_attendance a ON a."sessionId" = s.id
      WHERE lc."instructorId" = ${instructorId}
        AND s.status IN ('COMPLETED', 'LIVE')
        AND s."scheduledStart" >= ${cutoff}
      GROUP BY lc.id, lc.title, lc."batchName"
      ORDER BY "sessionsHeld" DESC, lc.id
      LIMIT 5
    `),
  ]);

  const totalSessions = sessionGroups.reduce(
    (total, row) => total + row._count._all,
    0,
  );
  const completedSessions =
    sessionGroups.find((row) => row.status === SessionStatus.COMPLETED)?._count
      ._all ?? 0;
  const attendeeTotal = attendanceGroups.reduce(
    (total, row) => total + row._count._all,
    0,
  );
  const presentCount = attendanceGroups
    .filter((row) => row.status === "PRESENT" || row.status === "LATE")
    .reduce((total, row) => total + row._count._all, 0);
  const byClass = classRows.map((row) => ({
    liveClassId: row.liveClassId,
    title: row.title,
    batchName: row.batchName,
    sessionsHeld: Number(row.sessionsHeld),
    averageAttendanceRate:
      Number(row.attendeeTotal) > 0
        ? Math.round((Number(row.presentTotal) / Number(row.attendeeTotal)) * 100)
        : 0,
  }));

  return {
    totalSessions,
    completedSessions,
    averageAttendanceRate:
      attendeeTotal > 0 ? Math.round((presentCount / attendeeTotal) * 100) : 0,
    byClass,
    byStudent: [],
  };
}

async function getOwnedSession(instructorId: string, sessionId: string) {
  const session = await prisma.liveClassSession.findFirst({
    where: {
      id: sessionId,
      liveClass: { instructorId },
    },
    include: sessionInclude,
  });

  if (!session) {
    throw new InstructorAuthError("Session not found.", 404);
  }

  return session;
}

export async function startInstructorSession(
  instructorId: string,
  sessionId: string,
): Promise<InstructorSession> {
  const session = await getOwnedSession(instructorId, sessionId);

  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    throw new InstructorAuthError(
      `Cannot start a ${session.status.toLowerCase()} session.`,
      400,
    );
  }

  const updated = await prisma.liveClassSession.update({
    where: { id: session.id, liveClass: { instructorId } },
    data: {
      status: SessionStatus.LIVE,
      actualStart: session.actualStart ?? new Date(),
      actualEnd: null,
    },
    include: sessionInclude,
  });

  await prisma.liveClass.update({
    where: { id: updated.liveClassId, instructorId },
    data: { status: LiveClassStatus.ACTIVE },
  });

  return serializeSession(updated);
}

export async function endInstructorSession(
  instructorId: string,
  sessionId: string,
): Promise<InstructorSession> {
  const session = await getOwnedSession(instructorId, sessionId);

  if (session.status !== "LIVE" && session.status !== "UPCOMING") {
    throw new InstructorAuthError(
      `Cannot end a ${session.status.toLowerCase()} session.`,
      400,
    );
  }

  const updated = await prisma.liveClassSession.update({
    where: { id: session.id, liveClass: { instructorId } },
    data: {
      status: SessionStatus.COMPLETED,
      actualEnd: new Date(),
      actualStart: session.actualStart ?? new Date(),
    },
    include: sessionInclude,
  });

  const remainingLive = await prisma.liveClassSession.count({
    where: {
      liveClassId: updated.liveClassId,
      status: SessionStatus.LIVE,
    },
  });

  if (remainingLive === 0) {
    await prisma.liveClass.update({
      where: { id: updated.liveClassId, instructorId },
      data: { status: LiveClassStatus.COMPLETED },
    });
  }

  // Best-effort: tear down LiveKit media room when ending from dashboard.
  void import("@/lib/livekit-server")
    .then((mod) => mod.deleteLiveKitRoom(sessionId))
    .catch((error) => console.warn("LIVEKIT_INSTRUCTOR_END_CLEANUP_WARN", error));

  return serializeSession(updated);
}

export async function cancelInstructorSession(
  instructorId: string,
  sessionId: string,
): Promise<InstructorSession> {
  const session = await getOwnedSession(instructorId, sessionId);

  if (session.status !== SessionStatus.UPCOMING) {
    throw new InstructorAuthError("Only upcoming sessions can be cancelled.", 400);
  }

  const updated = await prisma.liveClassSession.update({
    where: { id: session.id, liveClass: { instructorId } },
    data: { status: SessionStatus.CANCELLED },
    include: sessionInclude,
  });

  return serializeSession(updated);
}

export async function updateInstructorSessionSchedule(
  instructorId: string,
  sessionId: string,
  input: { scheduledStart: string; scheduledEnd: string },
): Promise<InstructorSession> {
  const session = await getOwnedSession(instructorId, sessionId);

  if (session.status !== SessionStatus.UPCOMING) {
    throw new InstructorAuthError("Only upcoming sessions can be rescheduled.", 400);
  }

  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(input.scheduledEnd);

  if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
    throw new InstructorAuthError("Invalid schedule times.", 400);
  }

  if (scheduledEnd <= scheduledStart) {
    throw new InstructorAuthError("End time must be after start time.", 400);
  }

  const updated = await prisma.liveClassSession.update({
    where: { id: session.id, liveClass: { instructorId } },
    data: { scheduledStart, scheduledEnd },
    include: sessionInclude,
  });

  return serializeSession(updated);
}

export async function listInstructorCourseOptions(instructorId: string) {
  return listInstructorAssignedCourses(instructorId);
}

async function listAssignedCourseIds(instructorId: string): Promise<Set<string>> {
  return listInstructorAssignedCourseIds(instructorId);
}

async function assertInstructorCanUseCourse(
  instructorId: string,
  courseId: string,
): Promise<void> {
  const assigned = await listAssignedCourseIds(instructorId);
  if (canInstructorUseCourse(assigned, courseId)) return;

  throw new InstructorAuthError(
    "You can only use courses assigned to you.",
    403,
  );
}

async function getOwnedLiveClass(instructorId: string, classId: string) {
  const liveClass = await prisma.liveClass.findFirst({
    where: { id: classId, instructorId },
    include: {
      sessions: { orderBy: { scheduledStart: "asc" }, take: 1 },
    },
  });

  if (!liveClass) {
    throw new InstructorAuthError("Class not found.", 404);
  }

  return liveClass;
}

export async function getInstructorClassForEdit(
  instructorId: string,
  classId: string,
): Promise<InstructorClassEditPayload> {
  const liveClass = await getOwnedLiveClass(instructorId, classId);
  const primarySession = liveClass.sessions[0];

  return {
    id: liveClass.id,
    title: liveClass.title,
    courseId: liveClass.courseId,
    subjectName: liveClass.subjectName,
    batchId: liveClass.batchId,
    batchCourseId: liveClass.batchCourseId,
    batchName: liveClass.batchName,
    meetingType: liveClass.meetingType,
    recurrence: liveClass.recurrence,
    durationMinutes: liveClass.durationMinutes,
    meetingLink: liveClass.meetingLink,
    waitingRoomEnabled: liveClass.waitingRoomEnabled,
    recordingEnabled: liveClass.recordingEnabled,
    autoAttendanceEnabled: liveClass.autoAttendanceEnabled,
    scheduledStart: primarySession?.scheduledStart.toISOString() ?? "",
    canEditSchedule: primarySession?.status === SessionStatus.UPCOMING,
  };
}

export function normalizeInstructorClassPayload(
  input: unknown,
  instructorId: string,
): InstructorCreateClassPayload {
  const payload = (input ?? {}) as Partial<InstructorCreateClassPayload>;
  const normalized = normalizeClassPayload({
    ...payload,
    instructorId,
    status: "SCHEDULED",
  });

  return {
    title: normalized.title,
    courseId: normalized.courseId,
    subjectName: normalized.subjectName,
    batchId: normalized.batchId,
    batchCourseId: normalized.batchCourseId,
    batchName: normalized.batchName,
    meetingType: normalized.meetingType,
    recurrence: normalized.recurrence,
    durationMinutes: normalized.durationMinutes,
    meetingLink: normalized.meetingLink,
    waitingRoomEnabled: normalized.waitingRoomEnabled,
    recordingEnabled: normalized.recordingEnabled,
    autoAttendanceEnabled: normalized.autoAttendanceEnabled,
    scheduledStart: normalized.scheduledStart,
  };
}

export async function createInstructorClass(
  instructorId: string,
  input: unknown,
): Promise<AdminClassDetail> {
  const payload = normalizeInstructorClassPayload(input, instructorId);
  await assertInstructorCanUseCourse(instructorId, payload.courseId);
  return createClass(
    {
      ...payload,
      instructorId,
      status: "SCHEDULED",
    },
    instructorId,
  );
}

export async function updateInstructorClass(
  instructorId: string,
  classId: string,
  input: unknown,
): Promise<AdminClassDetail> {
  const existing = await getOwnedLiveClass(instructorId, classId);
  const payload = normalizeInstructorClassPayload(input, instructorId);
  await assertInstructorCanUseCourse(instructorId, payload.courseId);

  const liveSession = await prisma.liveClassSession.findFirst({
    where: { liveClassId: classId, status: SessionStatus.LIVE },
    select: { id: true },
  });
  if (liveSession) {
    throw new InstructorAuthError(
      "End the live session before editing this class.",
      400,
    );
  }

  const primarySession = existing.sessions[0];
  if (primarySession && primarySession.status !== SessionStatus.UPCOMING) {
    const nextStart = new Date(payload.scheduledStart).getTime();
    const currentStart = primarySession.scheduledStart.getTime();
    if (
      Number.isFinite(nextStart) &&
      Math.abs(nextStart - currentStart) > 1000
    ) {
      throw new InstructorAuthError(
        "Schedule can only be changed for upcoming sessions.",
        400,
      );
    }
  }

  return updateClass(
    classId,
    {
      ...payload,
      instructorId,
      status: existing.status as "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED",
    },
    instructorId,
    { ownerInstructorId: instructorId },
  );
}

export async function deleteInstructorClass(
  instructorId: string,
  classId: string,
): Promise<void> {
  await getOwnedLiveClass(instructorId, classId);

  const liveCount = await prisma.liveClassSession.count({
    where: { liveClassId: classId, status: SessionStatus.LIVE },
  });
  if (liveCount > 0) {
    throw new InstructorAuthError(
      "End the live session before deleting this class.",
      400,
    );
  }

  await deleteClass(classId, instructorId, { ownerInstructorId: instructorId });
}

export async function getInstructorProfile(instructorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: instructorId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phoneEnc: true,
      photoUrl: true,
      createdAt: true,
    },
  });

  if (!user || user.role !== "INSTRUCTOR") {
    throw new InstructorAuthError("Instructor not found.", 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: decryptOptional(user.phoneEnc),
    photoUrl: user.photoUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateInstructorProfile(
  instructorId: string,
  input: InstructorProfileUpdateInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { id: true, passwordHash: true, role: true },
  });

  if (!user || user.role !== "INSTRUCTOR") {
    throw new InstructorAuthError("Instructor not found.", 404);
  }

  const data: {
    name?: string;
    passwordHash?: string;
    photoUrl?: string | null;
    phoneEnc?: string | null;
  } = {};

  if (typeof input.name === "string" && input.name.trim()) {
    data.name = input.name.trim();
  }

  if (input.phone !== undefined) {
    data.phoneEnc = encryptOptional(input.phone.trim() || undefined);
  }

  if (input.photoUrl !== undefined) {
    data.photoUrl = input.photoUrl?.trim() || null;
  }

  if (input.newPassword) {
    if (!input.currentPassword) {
      throw new InstructorAuthError("Current password is required.", 400);
    }
    if (!user.passwordHash) {
      throw new InstructorAuthError("Password is not set for this account.", 400);
    }
    const valid = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!valid) {
      throw new InstructorAuthError("Current password is incorrect.", 400);
    }
    data.passwordHash = await hashPassword(input.newPassword);
  }

  if (
    !data.name &&
    !data.passwordHash &&
    data.photoUrl === undefined &&
    data.phoneEnc === undefined
  ) {
    throw new InstructorAuthError("No profile changes were provided.", 400);
  }

  await prisma.user.update({
    where: { id: instructorId },
    data,
  });

  return getInstructorProfile(instructorId);
}
