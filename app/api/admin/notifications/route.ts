import { notificationJson } from "@/lib/notification-http";
import {
  createNotificationCampaign,
  listAdminNotificationData,
  NotificationCampaignError,
} from "@/lib/admin-notification-server";
import type { CreateNotificationCampaignInput } from "@/lib/admin-notification-types";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listHandler = async () => {
  try {
    return notificationJson(await listAdminNotificationData());
  } catch (error) {
    console.error("ADMIN_NOTIFICATIONS_LIST_ERROR", error);
    return notificationJson(
      { error: "Failed to load notification campaigns." },
      { status: 500 },
    );
  }
};

const createHandler = async (request: Request) => {
  try {
    const actorId = await getActorId();
    if (!actorId) {
      return notificationJson(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const body = (await request.json()) as CreateNotificationCampaignInput;
    const campaign = await createNotificationCampaign(body, actorId);
    return notificationJson({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof NotificationCampaignError) {
      return notificationJson(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("ADMIN_NOTIFICATIONS_CREATE_ERROR", error);
    return notificationJson(
      { error: "Failed to send the notification." },
      { status: 500 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.SETTINGS,
  "view",
  listHandler,
);
export const POST = withPermission(
  PermissionModule.SETTINGS,
  "create",
  createHandler,
);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
