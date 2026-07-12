import { NextResponse } from "next/server";
import {
  ensureInstructorStartingSoonNotifications,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-server";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    await ensureInstructorStartingSoonNotifications(instructor.id);
    const notifications = await listUserNotifications(instructor.id);
    const unreadCount = notifications.filter((item) => !item.readAt).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("INSTRUCTOR_NOTIFICATIONS_ERROR", error);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const instructor = await requireInstructor();
    const body = (await request.json()) as {
      notificationId?: string;
      markAll?: boolean;
    };

    if (body.markAll) {
      await markAllNotificationsRead(instructor.id);
      return NextResponse.json({ ok: true });
    }

    if (!body.notificationId) {
      return NextResponse.json({ error: "notificationId is required." }, { status: 400 });
    }

    await markNotificationRead(instructor.id, body.notificationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("INSTRUCTOR_NOTIFICATIONS_PATCH_ERROR", error);
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
  }
}
