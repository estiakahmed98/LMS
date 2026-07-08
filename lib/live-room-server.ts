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
            orderBy: { enrolledAt: "asc" },
          },
        },
      },
    },
  },
  attendances: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { joinTime: "asc" },
  },
  chatMessages: {
    include: {
      user: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: { sentAt: "asc" },
  },
};

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

function isActiveAttendance(attendance: RoomRow["attendances"][number]) {
  return (
    attendance.status === AttendanceStatus.PRESENT ||
    attendance.status === AttendanceStatus.LATE
  ) && attendance.leaveTime === null;
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

  // Anyone with an attendance row is already handled (joined, left, or rejected).
  const handledIds = new Set(row.attendances.map((attendance) => attendance.userId));

  return row.liveClass.course.enrollments
    .filter((enrollment) => enrollment.userId !== row.liveClass.instructorId)
    .filter((enrollment) => !handledIds.has(enrollment.userId))
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
  const isRejected =
    !isHost &&
    !!ownAttendance &&
    ownAttendance.status === AttendanceStatus.ABSENT &&
    !ownAttendance.joinTime;
  const isWaiting =
    !isHost &&
    !isRejected &&
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

  // Waiting-room guests stay pending until host admits them.
  // Host and sessions without waiting room join immediately.
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
  } else {
    const existing = await prisma.liveClassAttendance.findUnique({
      where: {
        sessionId_userId: {
          sessionId: row.id,
          userId: currentUser.id,
        },
      },
    });

    // Rejected guests stay out; already-present guests can rejoin.
    if (!(existing?.status === AttendanceStatus.ABSENT && !existing.joinTime)) {
      if (existing && isActiveAttendance(existing)) {
        await prisma.liveClassAttendance.update({
          where: { id: existing.id },
          data: {
            status: AttendanceStatus.PRESENT,
            joinTime: existing.joinTime ?? new Date(),
            leaveTime: null,
          },
        });
      }
    }
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
      status: AttendanceStatus.PRESENT,
    },
  });
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
      status: AttendanceStatus.PRESENT,
    },
  });

  return getLiveRoom(sessionId);
}
