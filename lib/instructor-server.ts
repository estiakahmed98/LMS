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
  InstructorParticipantsPayload,
  InstructorSession,
} from "@/lib/instructor-types";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { Prisma } from "@/lib/generated/prisma/client";
import { CourseStatus, LiveClassStatus, SessionStatus } from "@/lib/generated/prisma/enums";

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

export class InstructorAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "InstructorAuthError";
    this.status = status;
  }
}

export async function requireInstructor() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    throw new InstructorAuthError("You must be signed in.", 401);
  }

  if (user.role !== "INSTRUCTOR") {
    throw new InstructorAuthError("Instructor access required.", 403);
  }

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
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
  sessionId?: string | null,
): Promise<InstructorParticipantsPayload> {
  const sessions = (await listInstructorSessions(instructorId))
    .filter(
      (session) => session.status === "COMPLETED" || session.status === "LIVE",
    )
    .sort(
      (a, b) =>
        new Date(b.scheduledStart).getTime() -
        new Date(a.scheduledStart).getTime(),
    );

  const selectedSessionId =
    (sessionId && sessions.some((s) => s.id === sessionId) && sessionId) ||
    sessions[0]?.id ||
    null;

  if (!selectedSessionId) {
    return { sessions, attendance: [], selectedSessionId: null };
  }

  const attendanceRows = await prisma.liveClassAttendance.findMany({
    where: { sessionId: selectedSessionId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinTime: "asc" },
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

  return { sessions, attendance, selectedSessionId };
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
    where: { id: session.id },
    data: {
      status: SessionStatus.LIVE,
      actualStart: session.actualStart ?? new Date(),
      actualEnd: null,
    },
    include: sessionInclude,
  });

  await prisma.liveClass.update({
    where: { id: updated.liveClassId },
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
    where: { id: session.id },
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
      where: { id: updated.liveClassId },
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
    where: { id: session.id },
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
    where: { id: session.id },
    data: { scheduledStart, scheduledEnd },
    include: sessionInclude,
  });

  return serializeSession(updated);
}

export async function listInstructorCourseOptions(instructorId: string) {
  const assigned = await prisma.course.findMany({
    where: { liveClasses: { some: { instructorId } } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  if (assigned.length > 0) {
    return assigned;
  }

  return prisma.course.findMany({
    where: { status: CourseStatus.PUBLISHED },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

async function assertInstructorCanUseCourse(
  instructorId: string,
  courseId: string,
): Promise<void> {
  const assignedCount = await prisma.liveClass.count({
    where: { instructorId },
  });

  const isAssigned = await prisma.liveClass.findFirst({
    where: { instructorId, courseId },
    select: { id: true },
  });

  if (isAssigned) return;

  if (assignedCount === 0) {
    const published = await prisma.course.findFirst({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
      select: { id: true },
    });
    if (published) return;
  }

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

  await deleteClass(classId, instructorId);
}

export async function getInstructorProfile(instructorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || user.role !== "INSTRUCTOR") {
    throw new InstructorAuthError("Instructor not found.", 404);
  }

  return user;
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

  const data: { name?: string; passwordHash?: string } = {};

  if (typeof input.name === "string" && input.name.trim()) {
    data.name = input.name.trim();
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

  if (!data.name && !data.passwordHash) {
    throw new InstructorAuthError("No profile changes were provided.", 400);
  }

  return prisma.user.update({
    where: { id: instructorId },
    data,
    select: { id: true, name: true, email: true },
  });
}
