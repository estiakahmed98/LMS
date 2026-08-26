import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { LiveRoomError } from "@/lib/live-room-error";
import {
  filterVisibleMessages,
  isActiveAccountStatus,
  isInstructorRole,
  isLearnerRole,
} from "@/lib/portal-access";
import type {
  LiveRecordingMode,
  LiveRecordingStatus,
  LiveRoomCurrentUser,
  LiveRoomMessage,
  LiveRoomParticipant,
  LiveRoomPayload,
  LiveRoomStatePayload,
  LiveRoomWaitingUser,
} from "@/lib/live-room-types";
import {
  AttendanceStatus,
  BatchMembershipStatus,
  BatchStatus,
  EnrollmentStatus,
  LiveClassStatus,
  PermissionModule,
  SessionStatus,
} from "@/lib/generated/prisma/enums";
import {
  assertRolePermission,
  getRolePermissions,
  RbacError,
  type PermissionAction,
} from "@/lib/rbac";
import { hasModulePermission } from "@/lib/rbac-permissions";
import { logLiveEvent } from "@/lib/live-observability";
import { auditLogEntry, getActorId } from "@/lib/audit";
import { assertValidTransition, type LiveRecordingState } from "@/lib/live-recording-state-machine";
import { fetchRoomMessages } from "@/lib/live-room-select";

export { LiveRoomError };

const roomInclude = {
  liveClass: {
    include: {
      instructor: { select: { id: true, name: true, email: true, role: true } },
      batch: {
        select: {
          status: true,
          memberships: {
            where: { status: BatchMembershipStatus.ACTIVE },
            select: { userId: true },
          },
        },
      },
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
  joinRequests: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { requestedAt: "asc" as const },
  },
  chatMessages: {
    include: {
      user: { select: { id: true, name: true } },
      toUser: { select: { id: true, name: true } },
    },
    orderBy: [{ sentAt: "desc" as const }, { id: "desc" as const }],
    take: 50,
  },
} satisfies Prisma.LiveClassSessionInclude;

type RoomRow = Awaited<ReturnType<typeof getRoomRow>>;
type JoinRequestStatusValue = "PENDING" | "REJECTED";
type RoomJoinRequest = {
  userId: string;
  status: JoinRequestStatusValue;
  requestedAt: Date;
  user: {
    id: string;
    name: string;
  };
};

const liveClassJoinRequestModel = prisma.liveClassJoinRequest;

async function requireSignedInUser(): Promise<LiveRoomCurrentUser> {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) {
    throw new LiveRoomError("You must be signed in.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user) {
    throw new LiveRoomError("You must be signed in.", 401);
  }
  if (!isActiveAccountStatus(user.status)) {
    throw new LiveRoomError("This account is not active.", 403);
  }
  if (!isInstructorRole(user.role) && !isLearnerRole(user.role)) {
    throw new LiveRoomError("Live room access requires a portal account.", 403);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function requireLiveCapability(
  role: LiveRoomCurrentUser["role"],
  action: PermissionAction,
) {
  try {
    await assertRolePermission(role, PermissionModule.COURSES, action);
  } catch (error) {
    if (error instanceof RbacError) {
      throw new LiveRoomError(error.message, error.status);
    }
    throw error;
  }
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

function isEligibleLearner(row: RoomRow, userId: string) {
  const enrolled = row.liveClass.course.enrollments.some(
    (enrollment) => enrollment.userId === userId,
  );
  if (!enrolled) return false;
  return row.liveClass.batchId === null
    || Boolean(
      row.liveClass.batch?.status === BatchStatus.ACTIVE
      && row.liveClass.batch.memberships.some((membership) => membership.userId === userId),
    );
}

async function requireRoomAccess(sessionId: string) {
  const currentUser = await requireSignedInUser();
  await requireLiveCapability(currentUser.role, "view");
  const row = await getRoomRow(sessionId);
  const isHost =
    isInstructorRole(currentUser.role) &&
    row.liveClass.instructorId === currentUser.id;
  const hasEnrollment = isEligibleLearner(row, currentUser.id);

  if (
    !isHost &&
    (!isLearnerRole(currentUser.role) || !hasEnrollment)
  ) {
    throw new LiveRoomError("You do not have access to this live room.", 403);
  }

  const permissions = await getRolePermissions(currentUser.role);
  const canMutate = hasModulePermission(
    permissions,
    PermissionModule.COURSES,
    "edit",
  );

  return { currentUser, row, isHost, canMutate };
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

/**
 * LiveKit Cloud egress refuses file outputs without an upload destination
 * ("request has missing or invalid field: output"), so server-side cloud
 * recording only works when S3-compatible storage is configured. Without it
 * the room falls back to local mode: the host's browser records the class
 * and uploads the file to this app.
 */
function hasCloudRecordingStorage() {
  return Boolean(
    process.env.LIVEKIT_S3_ACCESS_KEY?.trim() &&
      process.env.LIVEKIT_S3_SECRET?.trim() &&
      process.env.LIVEKIT_S3_BUCKET?.trim(),
  );
}

function getRecordingMode(row: Pick<RoomRow, "recordingEgressId">): LiveRecordingMode {
  if (row.recordingEgressId) return "cloud";
  return hasCloudRecordingStorage() ? "cloud" : "local";
}

function normalizeRecordingStatus(value: string | null | undefined): LiveRecordingStatus {
  switch (value) {
    case "STARTING":
    case "ACTIVE":
    case "ENDING":
    case "COMPLETE":
    case "FAILED":
      return value;
    default:
      return "IDLE";
  }
}

function getJoinRequests(row: RoomRow): RoomJoinRequest[] {
  return ((row as RoomRow & { joinRequests?: RoomJoinRequest[] }).joinRequests ?? []) as RoomJoinRequest[];
}

function buildParticipants(row: RoomRow, currentUserId: string): LiveRoomParticipant[] {
  const byId = new Map<string, LiveRoomParticipant>();
  const activeAttendance = row.attendances.filter((attendance) =>
    isActiveAttendance(attendance),
  );
  const attendanceByUserId = new Map(
    activeAttendance.map((attendance) => [attendance.userId, attendance]),
  );

  const hostAttendance = attendanceByUserId.get(row.liveClass.instructor.id);
  byId.set(row.liveClass.instructor.id, {
    id: row.liveClass.instructor.id,
    name: row.liveClass.instructor.name,
    role: "HOST",
    micOn: true,
    cameraOn: true,
    handRaised: hostAttendance?.handRaised ?? false,
    isSelf: row.liveClass.instructor.id === currentUserId,
  });

  for (const attendance of activeAttendance) {
    if (byId.has(attendance.userId)) continue;

    byId.set(attendance.userId, {
      id: attendance.user.id,
      name: attendance.user.name,
      role: attendance.userId === row.liveClass.instructorId ? "HOST" : "PARTICIPANT",
      micOn: true,
      cameraOn: true,
      handRaised: attendance.handRaised,
      isSelf: attendance.userId === currentUserId,
    });
  }

  return [...byId.values()];
}

function buildWaitingUsers(row: RoomRow): LiveRoomWaitingUser[] {
  if (!row.liveClass.waitingRoomEnabled) return [];

  return getJoinRequests(row)
    .filter((request) => request.status === "PENDING")
    .map((request) => ({
      id: request.user.id,
      name: request.user.name,
    }))
    .slice(0, 8);
}

function buildMessages(
  row: RoomRow,
  viewerId: string,
  isHost: boolean,
): LiveRoomMessage[] {
  const messages = row.chatMessages.map((message) => ({
    id: message.id,
    senderId: message.userId,
    senderName: message.user.name,
    message: message.message,
    isPrivate: message.isPrivate,
    toUserId: message.toUserId,
    toName: message.toUser?.name ?? null,
    sentAt: message.sentAt.toISOString(),
  }));
  return filterVisibleMessages(messages, viewerId, isHost).reverse();
}

/** Narrow recurring-poll query: no chat and only the viewer's access rows. */
async function getStateRoomRow(
  sessionId: string,
  currentUser: LiveRoomCurrentUser,
): Promise<RoomRow> {
  const likelyHost = isInstructorRole(currentUser.role);
  const row = await prisma.liveClassSession.findUnique({
    where: { id: sessionId },
    include: {
      liveClass: {
        include: {
          instructor: { select: { id: true, name: true, email: true, role: true } },
          batch: {
            select: {
              status: true,
              memberships: {
                where: likelyHost
                  ? { status: BatchMembershipStatus.ACTIVE }
                  : { status: BatchMembershipStatus.ACTIVE, userId: currentUser.id },
                select: { userId: true },
              },
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              enrollments: {
                where: likelyHost
                  ? { status: EnrollmentStatus.APPROVED }
                  : { status: EnrollmentStatus.APPROVED, userId: currentUser.id },
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
      joinRequests: {
        where: likelyHost ? undefined : { userId: currentUser.id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { requestedAt: "asc" },
      },
      chatMessages: {
        where: { id: "__state_poll_has_no_messages__" },
        include: {
          user: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!row) throw new LiveRoomError("Live session not found.", 404);
  return row as RoomRow;
}

export async function getLiveRoomMessages(
  sessionId: string,
  options?: { cursor?: string | null; limit?: number },
) {
  const currentUser = await requireSignedInUser();
  await requireLiveCapability(currentUser.role, "view");
  const access = await prisma.liveClassSession.findUnique({
    where: { id: sessionId },
    select: {
      liveClass: {
        select: {
          instructorId: true,
          batchId: true,
          batch: {
            select: {
              status: true,
              memberships: {
                where: { userId: currentUser.id, status: BatchMembershipStatus.ACTIVE },
                select: { userId: true },
              },
            },
          },
          course: {
            select: {
              enrollments: {
                where: { userId: currentUser.id, status: EnrollmentStatus.APPROVED },
                select: { userId: true },
              },
            },
          },
        },
      },
    },
  });
  if (!access) throw new LiveRoomError("Live session not found.", 404);
  const isHost =
    isInstructorRole(currentUser.role) &&
    access.liveClass.instructorId === currentUser.id;
  const enrolled = access.liveClass.course.enrollments.length > 0;
  const inBatch =
    access.liveClass.batchId === null ||
    (access.liveClass.batch?.status === BatchStatus.ACTIVE &&
      access.liveClass.batch.memberships.length > 0);
  if (!isHost && (!isLearnerRole(currentUser.role) || !enrolled || !inBatch)) {
    throw new LiveRoomError("You do not have access to this live room.", 403);
  }
  return fetchRoomMessages(sessionId, currentUser.id, isHost, options);
}

function serializeRoom(
  row: RoomRow,
  currentUser: LiveRoomCurrentUser,
  isHost: boolean,
  canMutate: boolean,
): LiveRoomPayload {
  const participants = buildParticipants(row, currentUser.id);
  const waitingUsers = isHost ? buildWaitingUsers(row) : [];
  const joinRequests = getJoinRequests(row);
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
    joinRequests.some(
      (request) =>
        request.userId === currentUser.id && request.status === "PENDING",
    );

  const recordingStatus = normalizeRecordingStatus(row.recordingStatus);
  const isRecording =
    recordingStatus === "STARTING" ||
    recordingStatus === "ACTIVE" ||
    recordingStatus === "ENDING";

  return {
    session: {
      id: row.id,
      status: row.status,
      scheduledStart: row.scheduledStart.toISOString(),
      scheduledEnd: row.scheduledEnd.toISOString(),
      actualStart: row.actualStart?.toISOString() ?? null,
      actualEnd: row.actualEnd?.toISOString() ?? null,
      recordingUrl: row.recordingUrl,
      recordingStatus,
      recordingMode: getRecordingMode(row),
      isRecording,
      recordingAttemptId: row.recordingAttemptId,
      screenSharePolicy: row.screenSharePolicy,
      screenShareAllowedIds: row.screenShareAllowedIds,
    },
    version: row.updatedAt.getTime(),
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
    canMutate,
    isWaiting,
    isRejected,
    isRemoved,
    isSessionClosed,
    participants,
    waitingUsers,
    messages: buildMessages(row, currentUser.id, isHost),
  };
}

export async function getLiveRoom(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost, canMutate } = await requireRoomAccess(sessionId);
  // reconcileSessionRecording only writes when status is ENDING with a
  // pending egress; the vast majority of calls are a no-op, so it returns
  // the possibly-updated row directly instead of forcing every caller to
  // re-run the full (chat + enrollments + attendance) roomInclude fetch.
  const reconciledRow = await reconcileSessionRecording(sessionId, row);
  return serializeRoom(reconciledRow ?? row, currentUser, isHost, canMutate);
}

export async function getLiveRoomState(sessionId: string): Promise<LiveRoomStatePayload> {
  const currentUser = await requireSignedInUser();
  await requireLiveCapability(currentUser.role, "view");
  const row = await getStateRoomRow(sessionId, currentUser);
  const isHost =
    isInstructorRole(currentUser.role) && row.liveClass.instructorId === currentUser.id;
  const hasEnrollment = isEligibleLearner(row, currentUser.id);
  if (!isHost && (!isLearnerRole(currentUser.role) || !hasEnrollment)) {
    throw new LiveRoomError("You do not have access to this live room.", 403);
  }
  const permissions = await getRolePermissions(currentUser.role);
  const canMutate = hasModulePermission(permissions, PermissionModule.COURSES, "edit");
  const reconciledRow = await reconcileSessionRecording(sessionId, row);
  const { messages: _messages, ...state } = serializeRoom(
    reconciledRow ?? row,
    currentUser,
    isHost,
    canMutate,
  );
  return state;
}

export async function joinLiveRoom(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost, canMutate } = await requireRoomAccess(sessionId);

  if (
    row.status === SessionStatus.COMPLETED ||
    row.status === SessionStatus.CANCELLED
  ) {
    // Return closed payload so UI can show "session ended" without 400 crash.
    return serializeRoom(row, currentUser, isHost, canMutate);
  }

  if (!isHost) {
    const now = Date.now();
    const joinOpensAt = row.scheduledStart.getTime() - 10 * 60 * 1000;
    if (now < joinOpensAt) {
      throw new LiveRoomError("You can join this live class 10 minutes before it starts.", 403);
    }
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
    return serializeRoom(await getRoomRow(sessionId), currentUser, isHost, canMutate);
  }

  // Rejected (ABSENT, never joined) stay blocked.
  if (existing?.status === AttendanceStatus.ABSENT && !existing.joinTime) {
    return serializeRoom(await getRoomRow(sessionId), currentUser, isHost, canMutate);
  }

  // Host and sessions without waiting room join immediately.
  // Waiting-room guests stay pending (waiting list) until host admits —
  // including after a voluntary leave (PRESENT + leaveTime).
  const canJoinNow = isHost || !row.liveClass.waitingRoomEnabled;

  if (canJoinNow) {
    // Already actively present (e.g. a duplicate join call from a flaky
    // connection or a second tab) — refresh nothing. Resetting joinTime here
    // would silently discard how long they've actually been in the room;
    // only a genuine first-join or a resumption after a real leave should
    // set a fresh joinTime.
    const alreadyActive = existing ? isActiveAttendance(existing) : false;

    await prisma.$transaction([
      liveClassJoinRequestModel.deleteMany({
        where: {
          sessionId: row.id,
          userId: currentUser.id,
        },
      }),
      prisma.liveClassAttendance.upsert({
        where: {
          sessionId_userId: {
            sessionId: row.id,
            userId: currentUser.id,
          },
        },
        update: alreadyActive
          ? {}
          : {
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
      }),
    ]);
  } else {
    await liveClassJoinRequestModel.upsert({
      where: {
        sessionId_userId: {
          sessionId: row.id,
          userId: currentUser.id,
        },
      },
      update: {
        status: "PENDING",
        requestedAt: new Date(),
      },
      create: {
        sessionId: row.id,
        userId: currentUser.id,
        status: "PENDING",
      },
    });
  }

  if (isHost && row.status === SessionStatus.UPCOMING) {
    await requireLiveCapability(currentUser.role, "edit");
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
  // KNOWN LIMITATION: durationMinutes reflects only the latest join/leave
  // segment, not a running total across multiple rejoin cycles within the
  // same session — a user who joins/leaves several times will have earlier
  // segments' duration overwritten rather than summed. Fixing this properly
  // needs a per-segment attendance table; out of scope for this hardening
  // pass (no accurate multi-segment attendance analytics was requested).
  const durationMinutes = attendance.joinTime
    ? Math.max(1, Math.round((leaveTime.getTime() - attendance.joinTime.getTime()) / 60000))
    : attendance.durationMinutes;

  await prisma.liveClassAttendance.update({
    where: { id: attendance.id },
    data: {
      leaveTime,
      durationMinutes: durationMinutes ?? undefined,
      handRaised: false,
      // PRESENT + leaveTime = voluntary leave (may re-enter waiting / rejoin).
      status: AttendanceStatus.PRESENT,
    },
  });

  // Best-effort: drop this identity from LiveKit so peers stop seeing a ghost tile.
  void import("@/lib/livekit-server")
    .then((mod) => mod.removeLiveKitParticipant(sessionId, currentUser.id))
    .catch((error) => {
      logLiveEvent({
        requestId: "internal",
        route: "leaveLiveRoom",
        sessionId,
        userId: currentUser.id,
        status: 0,
        liveKitCleanupFailed: true,
      });
      console.warn("LIVEKIT_LEAVE_CLEANUP_WARN", error);
    });
}

export async function endLiveRoom(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);

  if (!isHost) {
    throw new LiveRoomError("Only the host can end this live room.", 403);
  }
  await requireLiveCapability(currentUser.role, "edit");

  // Stop active recording (cloud egress or host-side local) before tearing
  // down the media room. In local mode the host's browser flushes its last
  // chunks and finalizes while the page unmounts.
  {
    const status = normalizeRecordingStatus(row.recordingStatus);
    if (status === "STARTING" || status === "ACTIVE" || status === "ENDING") {
      try {
        await stopLiveRoomRecording(sessionId);
      } catch (error) {
        logLiveEvent({
          requestId: "internal",
          route: "endLiveRoom",
          sessionId,
          status: 0,
          message: "LIVE_RECORDING_END_CLEANUP_WARN",
        });
        console.warn("LIVE_RECORDING_END_CLEANUP_WARN", error);
      }
    }
  }

  const endTime = new Date();
  const openAttendances = await prisma.liveClassAttendance.findMany({
    where: {
      sessionId,
      leaveTime: null,
    },
  });

  await prisma.$transaction([
    prisma.liveClassAttendance.updateMany({
      where: {
        sessionId,
        leaveTime: null,
      },
      data: {
        leaveTime: endTime,
        status: AttendanceStatus.PRESENT,
      },
    }),
    ...openAttendances
      .filter((attendance) => attendance.joinTime)
      .map((attendance) =>
        prisma.liveClassAttendance.update({
          where: { id: attendance.id },
          data: {
            durationMinutes: Math.max(
              1,
              Math.round((endTime.getTime() - attendance.joinTime!.getTime()) / 60000),
            ),
          },
        }),
      ),
    prisma.liveClassSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        actualStart: row.actualStart ?? endTime,
        actualEnd: endTime,
      },
    }),
    prisma.liveClass.update({
      where: { id: row.liveClassId },
      data: { status: LiveClassStatus.COMPLETED },
    }),
  ]);

  await auditLogEntry({
    actorId: currentUser.id,
    action: "live.session.end",
    entity: "LiveClassSession",
    entityId: sessionId,
  });

  // Best-effort: drop LiveKit media room so all clients disconnect.
  void import("@/lib/livekit-server")
    .then((mod) => mod.deleteLiveKitRoom(sessionId))
    .catch((error) => {
      logLiveEvent({
        requestId: "internal",
        route: "endLiveRoom",
        sessionId,
        status: 0,
        liveKitCleanupFailed: true,
      });
      console.warn("LIVEKIT_END_CLEANUP_WARN", error);
    });

  return serializeRoom(await getRoomRow(sessionId), currentUser, true, true);
}

/**
 * `message` is expected to already be validated (length/control-chars) by
 * the caller's Zod schema (lib/live-validation.ts) — this function still
 * trims/empty-checks defensively since it's also reachable from tests and
 * any future non-HTTP caller.
 *
 * `clientMessageId` makes a retried submission (network retry, double
 * click) idempotent: the same id from the same sender in the same session
 * returns the existing message instead of creating a duplicate row.
 */
export async function sendLiveRoomMessage(
  sessionId: string,
  message: string,
  toUserId: string | undefined,
  clientMessageId: string,
): Promise<LiveRoomPayload> {
  const { currentUser, row } = await requireRoomAccess(sessionId);
  const trimmed = message.trim();
  const isHost = row.liveClass.instructorId === currentUser.id;
  const isActive = isHost || row.attendances.some((a) => a.userId === currentUser.id && isActiveAttendance(a));

  if (!trimmed) {
    throw new LiveRoomError("Message cannot be empty.", 400);
  }

  if (row.status === SessionStatus.COMPLETED || row.status === SessionStatus.CANCELLED) {
    throw new LiveRoomError("This session has ended.", 400);
  }

  if (!isActive) {
    throw new LiveRoomError("You can only chat after joining the live room.", 403);
  }

  if (toUserId && toUserId !== row.liveClass.instructorId && !isEligibleLearner(row, toUserId)) {
    throw new LiveRoomError("Invalid chat recipient.", 400);
  }

  const existing = await prisma.liveChatMessage.findUnique({
    where: {
      sessionId_userId_clientMessageId: {
        sessionId,
        userId: currentUser.id,
        clientMessageId,
      },
    },
  });

  if (!existing) {
    try {
      await prisma.liveChatMessage.create({
        data: {
          sessionId,
          userId: currentUser.id,
          message: trimmed,
          isPrivate: !!toUserId,
          toUserId: toUserId ?? null,
          clientMessageId,
        },
      });
    } catch (error) {
      // Concurrent identical retry raced this one to the unique constraint
      // — the other request's row already exists, so this is still a
      // successful idempotent send from the caller's point of view.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }

  return getLiveRoom(sessionId);
}

async function requireHostRoom(sessionId: string) {
  const access = await requireRoomAccess(sessionId);
  if (!access.isHost) {
    throw new LiveRoomError("Only the host can manage participants.", 403);
  }
  await requireLiveCapability(access.currentUser.role, "edit");
  return access;
}

function isEnrolledStudent(row: RoomRow, userId: string) {
  return isEligibleLearner(row, userId);
}

export async function admitLiveRoomParticipant(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  const { currentUser, row } = await requireHostRoom(sessionId);

  if (userId === row.liveClass.instructorId) {
    throw new LiveRoomError("Host is already in the room.", 400);
  }

  if (!isEnrolledStudent(row, userId)) {
    throw new LiveRoomError("User is not enrolled in this class.", 400);
  }

  const pendingRequest = getJoinRequests(row).find(
    (request) => request.userId === userId && request.status === "PENDING",
  );
  if (!pendingRequest) {
    throw new LiveRoomError("User has not requested to join this live class.", 404);
  }

  await prisma.$transaction([
    liveClassJoinRequestModel.deleteMany({
      where: { sessionId, userId },
    }),
    prisma.liveClassAttendance.upsert({
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
    }),
  ]);

  await auditLogEntry({
    actorId: currentUser.id,
    action: "live.participant.admit",
    entity: "LiveClassAttendance",
    entityId: `${sessionId}:${userId}`,
  });

  return getLiveRoom(sessionId);
}

export async function rejectLiveRoomWaitingUser(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  const { currentUser, row } = await requireHostRoom(sessionId);

  if (userId === row.liveClass.instructorId) {
    throw new LiveRoomError("Cannot reject the host.", 400);
  }

  if (!isEnrolledStudent(row, userId)) {
    throw new LiveRoomError("User is not enrolled in this class.", 400);
  }

  const pendingRequest = getJoinRequests(row).find(
    (request) => request.userId === userId && request.status === "PENDING",
  );
  if (!pendingRequest) {
    throw new LiveRoomError("User has not requested to join this live class.", 404);
  }

  await prisma.$transaction([
    liveClassJoinRequestModel.upsert({
      where: {
        sessionId_userId: {
          sessionId,
          userId,
        },
      },
      update: {
        status: "REJECTED",
        requestedAt: new Date(),
      },
      create: {
        sessionId,
        userId,
        status: "REJECTED",
      },
    }),
    // ABSENT without join keeps them out of waiting list and out of active room.
    prisma.liveClassAttendance.upsert({
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
    }),
  ]);

  await auditLogEntry({
    actorId: currentUser.id,
    action: "live.participant.reject",
    entity: "LiveClassJoinRequest",
    entityId: `${sessionId}:${userId}`,
  });

  return getLiveRoom(sessionId);
}

export async function removeLiveRoomParticipant(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  const { currentUser, row } = await requireHostRoom(sessionId);

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

  if (!attendance) {
    throw new LiveRoomError("Participant is not currently in the room.", 404);
  }

  // Idempotent: removing an already-removed participant is a no-op success
  // rather than a 404, so a retried/duplicate host action doesn't error.
  if (!isActiveAttendance(attendance)) {
    return getLiveRoom(sessionId);
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
      handRaised: false,
      // ABSENT + leaveTime = kicked (blocked until host admits again).
      status: AttendanceStatus.ABSENT,
    },
  });

  await auditLogEntry({
    actorId: currentUser.id,
    action: "live.participant.remove",
    entity: "LiveClassAttendance",
    entityId: `${sessionId}:${userId}`,
  });

  // Best-effort: cut kicked user from LiveKit media room immediately.
  void import("@/lib/livekit-server")
    .then((mod) => mod.removeLiveKitParticipant(sessionId, userId))
    .catch((error) => {
      logLiveEvent({
        requestId: "internal",
        route: "removeLiveRoomParticipant",
        sessionId,
        userId,
        status: 0,
        liveKitCleanupFailed: true,
      });
      console.warn("LIVEKIT_KICK_CLEANUP_WARN", error);
    });

  return getLiveRoom(sessionId);
}

/** Access guard for recording upload endpoints — host only. */
export async function requireLiveRoomHost(sessionId: string) {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);
  if (!isHost) {
    throw new LiveRoomError("Only the host can manage recordings.", 403);
  }
  await requireLiveCapability(currentUser.role, "edit");
  return { currentUser, row };
}

export async function startLiveRoomRecording(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);

  if (!isHost) {
    throw new LiveRoomError("Only the host can start recording.", 403);
  }
  await requireLiveCapability(currentUser.role, "edit");

  if (!row.liveClass.recordingEnabled) {
    throw new LiveRoomError("Recording is disabled for this live class.", 400);
  }

  if (row.status === SessionStatus.COMPLETED || row.status === SessionStatus.CANCELLED) {
    throw new LiveRoomError("Cannot record a closed session.", 400);
  }

  const currentStatus = normalizeRecordingStatus(row.recordingStatus);
  if (
    currentStatus === "STARTING" ||
    currentStatus === "ACTIVE" ||
    currentStatus === "ENDING"
  ) {
    return getLiveRoom(sessionId);
  }
  assertValidTransition(currentStatus, "STARTING");

  // A fresh recordingAttemptId invalidates any chunks uploaded under a
  // superseded attempt (see live-local-recording-server.ts) — this is what
  // prevents a stale/duplicate seq=0 from silently overwriting an active
  // different attempt's file.
  const recordingAttemptId = crypto.randomUUID();

  if (!hasCloudRecordingStorage()) {
    if (process.env.NODE_ENV === "production") {
      throw new LiveRoomError(
        "Production recording storage is not configured. Configure LIVEKIT_S3_* before starting a recording.",
        503,
      );
    }
    // Local mode: the host's browser records the room and uploads chunks to
    // /recording/chunk, then /recording/finalize sets COMPLETE + the URL.
    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: {
        recordingStatus: "ACTIVE",
        recordingEgressId: null,
        recordingAttemptId,
        recordingChunkCount: 0,
        recordingBytesTotal: 0,
        recordingLastSeq: null,
      },
    });
    await auditLogEntry({
      actorId: currentUser.id,
      action: "live.recording.start",
      entity: "LiveClassSession",
      entityId: sessionId,
      changes: { mode: "local", recordingAttemptId },
    });
    return getLiveRoom(sessionId);
  }

  await prisma.liveClassSession.update({
    where: { id: sessionId },
    data: {
      recordingStatus: "STARTING",
      recordingAttemptId,
      recordingChunkCount: 0,
      recordingBytesTotal: 0,
      recordingLastSeq: null,
    },
  });

  try {
    const { startLiveKitRecording } = await import("@/lib/livekit-server");
    const result = await startLiveKitRecording(sessionId);

    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: {
        recordingEgressId: result.egressId,
        recordingStatus: result.status === "STARTING" ? "STARTING" : "ACTIVE",
        recordingUrl: result.url ?? undefined,
        recordingSizeMb: result.sizeMb ?? undefined,
      },
    });
  } catch (error) {
    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: {
        recordingStatus: "FAILED",
        recordingEgressId: null,
      },
    });
    throw error;
  }

  await auditLogEntry({
    actorId: currentUser.id,
    action: "live.recording.start",
    entity: "LiveClassSession",
    entityId: sessionId,
    changes: { mode: "cloud", recordingAttemptId },
  });

  return getLiveRoom(sessionId);
}

export async function stopLiveRoomRecording(sessionId: string): Promise<LiveRoomPayload> {
  const { currentUser, row, isHost } = await requireRoomAccess(sessionId);

  if (!isHost) {
    throw new LiveRoomError("Only the host can stop recording.", 403);
  }
  await requireLiveCapability(currentUser.role, "edit");

  if (!row.recordingEgressId) {
    const currentStatus = normalizeRecordingStatus(row.recordingStatus);
    const isLocalRecording =
      currentStatus === "STARTING" || currentStatus === "ACTIVE";
    const nextStatus = isLocalRecording
      ? "ENDING"
      : row.recordingUrl
        ? "COMPLETE"
        : "IDLE";
    if (isLocalRecording) {
      assertValidTransition(currentStatus, nextStatus);
    }
    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: {
        // Local recording: ENDING until the host's browser uploads the last
        // chunks and calls /recording/finalize.
        recordingStatus: nextStatus,
      },
    });
    if (isLocalRecording) {
      await auditLogEntry({
        actorId: currentUser.id,
        action: "live.recording.stop",
        entity: "LiveClassSession",
        entityId: sessionId,
        changes: { mode: "local" },
      });
    }
    return getLiveRoom(sessionId);
  }

  assertValidTransition(normalizeRecordingStatus(row.recordingStatus), "ENDING");

  await prisma.liveClassSession.update({
    where: { id: sessionId },
    data: { recordingStatus: "ENDING" },
  });

  await auditLogEntry({
    actorId: currentUser.id,
    action: "live.recording.stop",
    entity: "LiveClassSession",
    entityId: sessionId,
    changes: { mode: "cloud" },
  });

  const { stopLiveKitRecording, getLiveKitRecording } = await import("@/lib/livekit-server");

  let result = await stopLiveKitRecording(row.recordingEgressId);

  // File location may not be ready immediately — brief poll.
  if (!result.url && (result.status === "ENDING" || result.status === "ACTIVE")) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        result = await getLiveKitRecording(row.recordingEgressId);
        if (result.url || result.status === "COMPLETE" || result.status === "FAILED") {
          break;
        }
      } catch {
        break;
      }
    }
  }

  await prisma.liveClassSession.update({
    where: { id: sessionId },
    data: recordingDataFromEgressResult(row.recordingEgressId, result),
  });

  return getLiveRoom(sessionId);
}

type RecordingEgressSnapshot = {
  status: string;
  url?: string | null;
  sizeMb?: number | null;
};

function recordingDataFromEgressResult(
  egressId: string,
  result: RecordingEgressSnapshot,
) {
  const normalized = normalizeRecordingStatus(result.status);
  const isFinal =
    normalized === "COMPLETE" ||
    normalized === "FAILED" ||
    Boolean(result.url);

  return {
    recordingStatus: isFinal
      ? normalized === "FAILED"
        ? "FAILED"
        : "COMPLETE"
      : "ENDING",
    recordingUrl: result.url ?? undefined,
    recordingSizeMb: result.sizeMb ?? undefined,
    recordingEgressId: isFinal ? null : egressId,
  } as const;
}

/**
 * Only acts when the session is ENDING with a pending cloud egress. Returns
 * the freshly-fetched row when it wrote a change, or null when it was a
 * no-op — callers use that to avoid an unconditional extra roomInclude
 * fetch on every single getLiveRoom() call.
 */
async function reconcileSessionRecording(
  sessionId: string,
  row: Pick<RoomRow, "recordingStatus" | "recordingEgressId">,
): Promise<RoomRow | null> {
  const status = normalizeRecordingStatus(row.recordingStatus);
  if (status !== "ENDING" || !row.recordingEgressId) return null;

  try {
    const { getLiveKitRecording } = await import("@/lib/livekit-server");
    const result = await getLiveKitRecording(row.recordingEgressId);
    const update = recordingDataFromEgressResult(row.recordingEgressId, result);
    if (update.recordingStatus === "ENDING") return null;

    await prisma.liveClassSession.update({
      where: { id: sessionId },
      data: update,
    });
    return getRoomRow(sessionId);
  } catch (error) {
    logLiveEvent({
      requestId: "internal",
      route: "reconcileSessionRecording",
      sessionId,
      status: 0,
      message: "LIVEKIT_RECORDING_RECONCILE_WARN",
    });
    console.warn("LIVEKIT_RECORDING_RECONCILE_WARN", error);
    return null;
  }
}

export async function setLiveRoomHandRaised(
  sessionId: string,
  raised: boolean,
): Promise<LiveRoomPayload> {
  const { currentUser, row } = await requireRoomAccess(sessionId);

  if (
    row.status === SessionStatus.COMPLETED ||
    row.status === SessionStatus.CANCELLED
  ) {
    throw new LiveRoomError("This session has ended.", 400);
  }

  const attendance = await prisma.liveClassAttendance.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId: currentUser.id,
      },
    },
  });

  if (!attendance || !isActiveAttendance(attendance)) {
    throw new LiveRoomError("You must be in the room to raise your hand.", 400);
  }

  if (attendance.handRaised === raised) {
    return getLiveRoom(sessionId);
  }

  await prisma.liveClassAttendance.update({
    where: { id: attendance.id },
    data: { handRaised: raised },
  });

  return getLiveRoom(sessionId);
}

export async function lowerLiveRoomParticipantHand(
  sessionId: string,
  userId: string,
): Promise<LiveRoomPayload> {
  await requireHostRoom(sessionId);

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

  if (!attendance.handRaised) {
    return getLiveRoom(sessionId);
  }

  await prisma.liveClassAttendance.update({
    where: { id: attendance.id },
    data: { handRaised: false },
  });

  return getLiveRoom(sessionId);
}
