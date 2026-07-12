import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/lib/generated/prisma/client";
import {
  STARTING_SOON_WINDOW_MS,
} from "@/lib/live-session-utils";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  readAt: string | null;
  createdAt: string;
}

function serialize(row: {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
}): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUserNotifications(userId: string, limit = 20) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(serialize);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const row = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
  if (row.count === 0) {
    throw new Error("Notification not found.");
  }
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
}) {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type ?? NotificationType.INFO,
    },
  });
  return serialize(row);
}

/** Idempotent starting-soon alerts for instructor upcoming sessions. */
export async function ensureInstructorStartingSoonNotifications(instructorId: string) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + STARTING_SOON_WINDOW_MS);

  const sessions = await prisma.liveClassSession.findMany({
    where: {
      status: "UPCOMING",
      scheduledStart: { gt: now, lte: windowEnd },
      liveClass: { instructorId },
    },
    include: { liveClass: { select: { title: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  for (const session of sessions) {
    const marker = `starting-soon:${session.id}`;
    const existing = await prisma.notification.findFirst({
      where: {
        userId: instructorId,
        message: { contains: marker },
        createdAt: { gte: new Date(now.getTime() - STARTING_SOON_WINDOW_MS) },
      },
    });
    if (existing) continue;

    const minutes = Math.max(
      1,
      Math.ceil((session.scheduledStart.getTime() - now.getTime()) / 60000),
    );

    await createNotification({
      userId: instructorId,
      title: "Class starting soon",
      message: `${session.liveClass.title} starts in ${minutes} min. ${marker}`,
      type: NotificationType.INFO,
    });
  }
}

export async function notifyInstructorRecordingReady(sessionId: string) {
  const session = await prisma.liveClassSession.findUnique({
    where: { id: sessionId },
    include: {
      liveClass: {
        select: { title: true, instructorId: true },
      },
    },
  });

  if (!session?.recordingUrl || !session.liveClass) return;

  const marker = `recording-ready:${sessionId}`;
  const existing = await prisma.notification.findFirst({
    where: {
      userId: session.liveClass.instructorId,
      message: { contains: marker },
    },
  });
  if (existing) return;

  await createNotification({
    userId: session.liveClass.instructorId,
    title: "Recording ready",
    message: `The recording for "${session.liveClass.title}" is ready to view. ${marker}`,
    type: NotificationType.SUCCESS,
  });
}
