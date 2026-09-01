import { searchActivityEntities } from "@/lib/admin-activity-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getEntitiesHandler = async (request: Request) => {
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const entities = await searchActivityEntities(search);
  return NextResponse.json({ entities }, { headers: { "Cache-Control": "no-store" } });
};

export const GET = withPermission(PermissionModule.ROLES, "view", getEntitiesHandler);
