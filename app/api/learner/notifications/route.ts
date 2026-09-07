import { notificationJson } from "@/lib/notification-http";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import {
  countUnreadNotifications,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notification-server";

export async function GET() {
  try {
    const learner = await requireLearner("/settings", null);
    const [notifications, unreadCount] = await Promise.all([
      listUserNotifications(learner.id),
      countUnreadNotifications(learner.id),
    ]);
    return notificationJson({
      notifications,
      unreadCount,
    });
  } catch (error) {
    return handleError(error, "Failed to load notifications.");
  }
}

export async function PATCH(request: Request) {
  try {
    const learner = await requireLearner("/settings", null);
    const body = (await request.json()) as {
      notificationId?: string;
      markAll?: boolean;
    };

    if (body.markAll) {
      await markAllNotificationsRead(learner.id);
      return notificationJson({ ok: true });
    }
    if (!body.notificationId) {
      return notificationJson(
        { error: "notificationId is required." },
        { status: 400 },
      );
    }

    await markNotificationRead(learner.id, body.notificationId);
    return notificationJson({ ok: true });
  } catch (error) {
    return handleError(error, "Failed to update notifications.");
  }
}

function handleError(error: unknown, fallback: string) {
  if (error instanceof LearnerAuthError) {
    return notificationJson(
      { error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof Error && error.message === "Notification not found.") {
    return notificationJson({ error: error.message }, { status: 404 });
  }
  console.error("LEARNER_NOTIFICATIONS_ERROR", error);
  return notificationJson({ error: fallback }, { status: 500 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
