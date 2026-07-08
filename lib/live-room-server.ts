import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type {
  LiveRoomCurrentUser,
  LiveRoomMessage,
  LiveRoomParticipant,
  LiveRoomPayload,
  LiveRoomWaitingUser,
} from "@/lib/live-room-types";
import {
  AttendanceStatus,
  EnrollmentStatus,
  LiveClassStatus,
  SessionStatus,
} from "@/lib/generated/prisma/enums";

export class LiveRoomError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LiveRoomError";
    this.status = status;
  }
}

const roomInclude = {
  liveClass: {
    include: {
      instructor: { select: { id: true, name: true, email: true, role: true } },
      course: {
        select: {
          id: true,
          title: true,
          enrollments: {
            where: { status: EnrollmentStatus.APPROVED },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { enrolledAt: "asc" as const },
          },
        },
      },
    },
  },
  attendances: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinTime: "asc" as const },
  },
  chatMessages: {
    include: {
      user: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: { sentAt: "asc" as const },
  },
} as const;

type RoomRow = Awaited<ReturnType<typeof getRoomRow>>;

async function requireSignedInUser(): Promise<LiveRoomCurrentUser> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    throw new LiveRoomError("You must be signed in.", 401);
  }

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
  };
}

async function getRoomRow(sessionId: string) {
  const row = await prisma.liveClassSession.findUnique({
    where: { id: sessionId },
    include: roomInclude,
  });

  if (!row) {
    throw new LiveRoomError("Live session not found.", 404);
  }

  return row;
}

async function requireRoomAccess(sessionId: string) {
  const currentUser = await requireSignedInUser();
  const row = await getRoomRow(sessionId);
  const isHost = row.liveClass.instructorId === currentUser.id;
  const hasEnrollment = row.liveClass.course.enrollments.some(
    (enrollment) => enrollment.userId === currentUser.id,
  );

  if (!isHost && !hasEnrollment) {
    throw new LiveRoomError("You do not have access to this live room.", 403);
  }

  return { currentUser, row, isHost };
}

function isActiveAttendance(attendance: {
  status: AttendanceStatus;
  leaveTime: Date | null;
}) {
  return (
    (attendance.status === AttendanceStatus.PRESENT ||
      attendance.status === AttendanceStatus.LATE) &&
    attendance.leaveTime === null
  );
}

function buildParticipants(row: RoomRow, currentUserId: string): LiveRoomParticipant[] {
  const byId = new Map<string, LiveRoomParticipant>();

  byId.set(row.liveClass.instructor.id, {
    id: row.liveClass.instructor.id,
    name: row.liveClass.instructor.name,
    role: "HOST",
    micOn: true,
    cameraOn: true,
    handRaised: false,
    isSelf: row.liveClass.instructor.id === currentUserId,
  });

  for (const attendance of row.attendances) {
    if (!isActiveAttendance(attendance)) continue;
    if (byId.has(attendance.userId)) continue;

    byId.set(attendance.userId, {
      id: attendance.user.id,
      name: attendance.user.name,
      role: attendance.userId === row.liveClass.instructorId ? "HOST" : "PARTICIPANT",
      micOn: true,
      cameraOn: true,
      handRaised: false,
      isSelf: attendance.userId === currentUserId,
    });
  }

  return [...byId.values()];
}

function buildWaitingUsers(row: RoomRow): LiveRoomWaitingUser[] {
  if (!row.liveClass.waitingRoomEnabled) return [];

  const activeIds = new Set(
    row.attendances.filter(isActiveAttendance).map((attendance) => attendance.userId),
  );
  // Rejected only (never joined) stay blocked from the waiting list.
  // Kicked users (ABSENT + leaveTime) reappear so the host can admit them again.
  const rejectedIds = new Set(
    row.attendances
      .filter(
        (attendance) =>
          attendance.status === AttendanceStatus.ABSENT &&
          !attendance.joinTime &&
          !attendance.leaveTime,
      )
      .map((attendance) => attendance.userId),
  );

  return row.liveClass.course.enrollments
    .filter((enrollment) => enrollment.userId !== row.liveClass.instructorId)
    .filter((enrollment) => !activeIds.has(enrollment.userId))
    .filter((enrollment) => !rejectedIds.has(enrollment.userId))
    .map((enrollment) => ({
      id: enrollment.user.id,
      name: enrollment.user.name,
    }))
    .slice(0, 8);
}

function buildMessages(row: RoomRow): LiveRoomMessage[] {
  return row.chatMessages.map((message) => ({
    id: message.id,
    senderId: message.userId,
    senderName: message.user.name,
    message: message.message,
    isPrivate: message.isPrivate,
    toUserId: message.toUserId,
    toName: message.toUser?.name ?? null,
    sentAt: message.sentAt.toISOString(),
  }));
}

function serializeRoom(
  row: RoomRow,
  currentUser: LiveRoomCurrentUser,
  isHost: boolean,
): LiveRoomPayload {
  const participants = buildParticipants(row, currentUser.id);
  const waitingUsers = buildWaitingUsers(row);
  const ownAttendance = row.attendances.find(
    (attendance) => attendance.userId === currentUser.id,
  );
  const isActive = participants.some((participant) => participant.id === currentUser.id);
  const isSessionClosed =
    row.status === SessionStatus.COMPLETED || row.status === SessionStatus.CANCELLED;
  // Never joined + host declined
  const isRejected =
    !isHost &&
    !!ownAttendance &&
    ownAttendance.status === AttendanceStatus.ABSENT &&
    !ownAttendance.joinTime &&
    !ownAttendance.leaveTime;
  // Host kicked (or removed) — ABSENT with leaveTime
  const isRemoved =
    !isHost &&
    !isSessionClosed &&
    !!ownAttendance &&
    ownAttendance.status === AttendanceStatus.ABSENT &&
    !!ownAttendance.leaveTime;
  const isWaiting =
    !isHost &&
    !isRejected &&
    !isRemoved &&
    !isSessionClosed &&
    row.liveClass.waitingRoomEnabled &&
    !isActive &&
    waitingUsers.some((user) => user.id === currentUser.id);

  return {
    session: {
      id: row.id,
      status: row.status,
      scheduledStart: row.scheduledStart.toISOString(),
      scheduledEnd: row.scheduledEnd.toISOString(),
      actualStart: row.actualStart?.toISOString() ?? null,
      actualEnd: row.actualEnd?.toISOString() ?? null,
    },
    liveClass: {
      id: row.liveClass.id,
      title: row.liveClass.title,
      subjectName: row.liveClass.subjectName,
      batchName: row.liveClass.batchName,
      courseId: row.liveClass.course.id,
      courseTitle: row.liveClass.course.title,
      instructorId: row.liveClass.instructorId,
      waitingRoomEnabled: row.liveClass.waitingRoomEnabled,
      recordingEnabled: row.liveClass.recordingEnabled,
      autoAttendanceEnabled: row.liveClass.autoAttendanceEnabled,
    },
    currentUser,
    isHost,
    isWaiting,
    isRejected,
    isRemoved,
    isSessionClosed,
    participants,
    waitingUsers,
    messages: buildMessages(row),
  };
}

export async function getLiveRoom(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);
  return serializeRoom(row, currentUser, isHost);
}

export async function joinLiveRoom(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);

  if (
    row.status === SessionStatus.COMPLETED ||
    row.status === SessionStatus.CANCELLED
  ) {
    // Return closed payload so UI can show "session ended" without 400 crash.
    return serializeRoom(row, currentUser, isHost);
  }

  const existing = await prisma.liveClassAttendance.findUnique({
    where: {
      sessionId_userId: {
        sessionId: row.id,
        userId: currentUser.id,
      },
    },
  });

  // Kicked (ABSENT + leaveTime) stay blocked until host admits them.
  if (existing?.status === AttendanceStatus.ABSENT && existing.leaveTime) {
    return serializeRoom(await getRoomRow(sessionId), currentUser, isHost);
  }

  // Rejected (ABSENT, never joined) stay blocked.
  if (existing?.status === AttendanceStatus.ABSENT && !existing.joinTime) {
    return serializeRoom(await getRoomRow(sessionId), currentUser, isHost);
  }

  // Host and sessions without waiting room join immediately.
  // Waiting-room guests stay pending (waiting list) until host admits —
  // including after a voluntary leave (PRESENT + leaveTime).
  const canJoinNow = isHost || !row.liveClass.waitingRoomEnabled;

  if (canJoinNow) {
    await prisma.liveClassAttendance.upsert({
      where: {
        sessionId_userId: {
          sessionId: row.id,
          userId: currentUser.id,
        },
      },
      update: {
        status: AttendanceStatus.PRESENT,
        joinTime: new Date(),
        leaveTime: null,
      },
      create: {
        sessionId: row.id,
        userId: currentUser.id,
        status: AttendanceStatus.PRESENT,
        joinTime: new Date(),
      },
    });
  }

  if (isHost && row.status === SessionStatus.UPCOMING) {
    await prisma.liveClassSession.update({
      where: { id: row.id },
      data: {
        status: SessionStatus.LIVE,
        actualStart: row.actualStart ?? new Date(),
      },
    });

    await prisma.liveClass.update({
      where: { id: row.liveClassId },
      data: { status: LiveClassStatus.ACTIVE },
    });
  }

  return getLiveRoom(sessionId);
}

export async function leaveLiveRoom(sessionId: string): Promise<void> {
  const { currentUser } = await requireRoomAccess(sessionId);
  const attendance = await prisma.liveClassAttendance.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId: currentUser.id,
      },
    },
  });

  if (!attendance) return;

  const leaveTime = new Date();
  const durationMinutes = attendance.joinTime
    ? Math.max(1, Math.round((leaveTime.getTime() - attendance.joinTime.getTime()) / 60000))
    : attendance.durationMinutes;

  await prisma.liveClassAttendance.update({
    where: { id: attendance.id },
    data: {
      leaveTime,
      durationMinutes: durationMinutes ?? undefined,
      // PRESENT + leaveTime = voluntary leave (may re-enter waiting / rejoin).
      status: AttendanceStatus.PRESENT,
    },
  });

  // Best-effort: drop this identity from LiveKit so peers stop seeing a ghost tile.
  void import("@/lib/livekit-server")
    .then((mod) => mod.removeLiveKitParticipant(sessionId, currentUser.id))
    .catch((error) => console.warn("LIVEKIT_LEAVE_CLEANUP_WARN", error));
}

export async function endLiveRoom(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);

  if (!isHost) {
    throw new LiveRoomError("Only the host can end this live room.", 403);
  }

  const endTime = new Date();
  const openAttendances = await prisma.liveClassAttendance.findMany({
    where: {
      sessionId,
      leaveTime: null,
    },
  });

  await prisma.liveClassAttendance.updateMany({
    where: {
      sessionId,
      leaveTime: null,
    },
    data: {
      leaveTime: endTime,
      status: AttendanceStatus.PRESENT,
    },
  });

  await Promise.all(
    openAttendances.map((attendance) => {
      if (!attendance.joinTime) {
        return Promise.resolve();
      }

      return prisma.liveClassAttendance.update({
        where: { id: attendance.id },
        data: {
          durationMinutes: Math.max(
            1,
            Math.round((endTime.getTime() - attendance.joinTime.getTime()) / 60000),
          ),
        },
      });
    }),
  );

  await prisma.liveClassSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.COMPLETED,
      actualStart: row.actualStart ?? endTime,
      actualEnd: endTime,
    },
  });

  await prisma.liveClass.update({
    where: { id: row.liveClassId },
    data: { status: LiveClassStatus.COMPLETED },
  });

  // Best-effort: drop LiveKit media room so all clients disconnect.
  void import("@/lib/livekit-server")
    .then((mod) => mod.deleteLiveKitRoom(sessionId))
    .catch((error) => console.warn("LIVEKIT_END_CLEANUP_WARN", error));

  return serializeRoom(await getRoomRow(sessionId), currentUser, true);
}

export async function sendLiveRoomMessage(
  sessionId: string,
  message: string,
  toUserId?: string,
): Promise<LiveRoomPayload> {
  const { currentUser, row } = await requireRoomAccess(sessionId);
  const trimmed = message.trim();

  if (!trimmed) {
    throw new LiveRoomError("Message cannot be empty.", 400);
  }

  if (toUserId && !row.liveClass.course.enrollments.some((item) => item.userId === toUserId)) {
    if (toUserId !== row.liveClass.instructorId) {
      throw new LiveRoomError("Invalid chat recipient.", 400);
    }
  }

  await prisma.liveChatMessage.create({
    data: {
      sessionId,
      userId: currentUser.id,
      message: trimmed,
      isPrivate: !!toUserId,
      toUserId: toUserId ?? null,
    },
  });

  return getLiveRoom(sessionId);
}

async function requireHostRoom(sessionId: string) {
  const access = await requireRoomAccess(sessionId);
  if (!access.isHost) {
    throw new LiveRoomError("Only the host can manage participants.", 403);
  }
  return access;
}

function isEnrolledStudent(row: RoomRow, userId: string) {
  return row.liveClass.course.enrollments.some(
    (enrollment) => enrollment.userId === userId,
  );
}

export async function admitLiveRoomParticipant(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  const { row } = await requireHostRoom(sessionId);

  if (userId === row.liveClass.instructorId) {
    throw new LiveRoomError("Host is already in the room.", 400);
  }

  if (!isEnrolledStudent(row, userId)) {
    throw new LiveRoomError("User is not enrolled in this class.", 400);
  }

  await prisma.liveClassAttendance.upsert({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    update: {
      status: AttendanceStatus.PRESENT,
      joinTime: new Date(),
      leaveTime: null,
    },
    create: {
      sessionId,
      userId,
      status: AttendanceStatus.PRESENT,
      joinTime: new Date(),
    },
  });

  return getLiveRoom(sessionId);
}

export async function rejectLiveRoomWaitingUser(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  const { row } = await requireHostRoom(sessionId);

  if (userId === row.liveClass.instructorId) {
    throw new LiveRoomError("Cannot reject the host.", 400);
  }

  if (!isEnrolledStudent(row, userId)) {
    throw new LiveRoomError("User is not enrolled in this class.", 400);
  }

  // ABSENT without join keeps them out of waiting list and out of active room.
  await prisma.liveClassAttendance.upsert({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    update: {
      status: AttendanceStatus.ABSENT,
      joinTime: null,
      leaveTime: null,
      durationMinutes: null,
    },
    create: {
      sessionId,
      userId,
      status: AttendanceStatus.ABSENT,
    },
  });

  return getLiveRoom(sessionId);
}

export async function removeLiveRoomParticipant(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  const { row } = await requireHostRoom(sessionId);

  if (userId === row.liveClass.instructorId) {
    throw new LiveRoomError("Cannot remove the host.", 400);
  }

  const attendance = await prisma.liveClassAttendance.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
  });

  if (!attendance || !isActiveAttendance(attendance)) {
    throw new LiveRoomError("Participant is not currently in the room.", 404);
  }

  const leaveTime = new Date();
  const durationMinutes = attendance.joinTime
    ? Math.max(1, Math.round((leaveTime.getTime() - attendance.joinTime.getTime()) / 60000))
    : undefined;

  await prisma.liveClassAttendance.update({
    where: { id: attendance.id },
    data: {
      leaveTime,
      durationMinutes,
      // ABSENT + leaveTime = kicked (blocked until host admits again).
      status: AttendanceStatus.ABSENT,
    },
  });

  // Best-effort: cut kicked user from LiveKit media room immediately.
  void import("@/lib/livekit-server")
    .then((mod) => mod.removeLiveKitParticipant(sessionId, userId))
    .catch((error) => console.warn("LIVEKIT_KICK_CLEANUP_WARN", error));

  return getLiveRoom(sessionId);
}
