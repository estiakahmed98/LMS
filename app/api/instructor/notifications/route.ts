import { notificationJson } from "@/lib/notification-http";
import {
  countUnreadNotifications,
  ensureInstructorStartingSoonNotifications,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-server";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor(null);
    await ensureInstructorStartingSoonNotifications(instructor.id);
    const [notifications, unreadCount] = await Promise.all([
      listUserNotifications(instructor.id),
      countUnreadNotifications(instructor.id),
    ]);
    return notificationJson({ notifications, unreadCount });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return notificationJson({ error: error.message }, { status: error.status });
    }
    console.error("INSTRUCTOR_NOTIFICATIONS_ERROR", error);
    return notificationJson({ error: "Failed to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const instructor = await requireInstructor(null);
    const body = (await request.json()) as {
      notificationId?: string;
      markAll?: boolean;
    };

    if (body.markAll) {
      await markAllNotificationsRead(instructor.id);
      return notificationJson({ ok: true });
    }

    if (!body.notificationId) {
      return notificationJson({ error: "notificationId is required." }, { status: 400 });
    }

    await markNotificationRead(instructor.id, body.notificationId);
    return notificationJson({ ok: true });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return notificationJson({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "Notification not found.") {
      return notificationJson({ error: error.message }, { status: 404 });
    }
    console.error("INSTRUCTOR_NOTIFICATIONS_PATCH_ERROR", error);
    return notificationJson({ error: "Failed to update notifications." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
