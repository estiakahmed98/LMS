import { NextResponse } from "next/server";
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
    return NextResponse.json(await listAdminNotificationData());
  } catch (error) {
    console.error("ADMIN_NOTIFICATIONS_LIST_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load notification campaigns." },
      { status: 500 },
    );
  }
};

const createHandler = async (request: Request) => {
  try {
    const actorId = await getActorId();
    if (!actorId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const body = (await request.json()) as CreateNotificationCampaignInput;
    const campaign = await createNotificationCampaign(body, actorId);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof NotificationCampaignError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("ADMIN_NOTIFICATIONS_CREATE_ERROR", error);
    return NextResponse.json(
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
