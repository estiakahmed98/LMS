import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type {
  InstructorAttendanceRow,
  InstructorParticipantsPayload,
  InstructorSession,
} from "@/lib/instructor-types";
import { Prisma } from "@/lib/generated/prisma/client";
import { LiveClassStatus, SessionStatus } from "@/lib/generated/prisma/enums";

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
