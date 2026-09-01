import { searchActivityActors } from "@/lib/admin-activity-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getActorsHandler = async (request: Request) => {
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  const actors = await searchActivityActors(search);
  return NextResponse.json({ actors }, { headers: { "Cache-Control": "no-store" } });
};

export const GET = withPermission(PermissionModule.ROLES, "view", getActorsHandler);
