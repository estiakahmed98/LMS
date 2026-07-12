import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import { buildRecurringSessionTimes } from "@/lib/recurrence-sessions";
import type {
  AdminClassDetail,
  AdminClassPayload,
  AdminClassSummary,
} from "@/lib/admin-class-types";
import {
  LiveClassStatus,
  MeetingType,
  RecurrencePattern,
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

export async function listClasses() {
  const classes = await prisma.liveClass.findMany({
    include: classListInclude,
    orderBy: { createdAt: "desc" },
  });

  return classes.map(serializeClassSummary);
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

  if (!payload.title?.trim()) {
    throw new Error("Class title is required.");
  }
  if (!payload.courseId?.trim()) {
    throw new Error("Course is required.");
  }
  if (!payload.instructorId?.trim()) {
    throw new Error("Instructor is required.");
  }
  if (!payload.batchName?.trim()) {
    throw new Error("Batch name is required.");
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
    batchName: payload.batchName.trim(),
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

export async function createClass(payload: AdminClassPayload, actorId: string | null) {
  const { scheduledStart, ...classData } = payload;
  const scheduledStartDate = new Date(scheduledStart);
  const sessionTimes = buildRecurringSessionTimes({
    recurrence: payload.recurrence,
    scheduledStart: scheduledStartDate,
    durationMinutes: payload.durationMinutes,
  });

  const liveClass = await prisma.liveClass.create({
    data: {
      ...classData,
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
) {
  const { scheduledStart, ...classData } = payload;
  const scheduledStartDate = new Date(scheduledStart);
  const scheduledEndDate = new Date(
    scheduledStartDate.getTime() + payload.durationMinutes * 60_000,
  );

  const existingSessions = await prisma.liveClassSession.findMany({
    where: { liveClassId: classId },
    orderBy: { scheduledStart: "asc" },
  });
  const primarySession = existingSessions[0];

  const liveClass = await prisma.liveClass.update({
    where: { id: classId },
    data: {
      ...classData,
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

export async function deleteClass(classId: string, actorId: string | null) {
  await prisma.liveClass.delete({ where: { id: classId } });

  await auditLogEntry({
    actorId,
    action: "class.deleted",
    entity: "LiveClass",
    entityId: classId,
  });
}
