import { searchActivityActions } from "@/lib/admin-activity-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getActionsHandler = async (request: Request) => {
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const actions = await searchActivityActions(search);
  return NextResponse.json({ actions }, { headers: { "Cache-Control": "no-store" } });
};

export const GET = withPermission(PermissionModule.ROLES, "view", getActionsHandler);
