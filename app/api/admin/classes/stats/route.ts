import { getClassStats } from "@/lib/admin-class-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getStatsHandler = async () => {
  const stats = await getClassStats();
  return NextResponse.json({ stats });
};

export const GET = withPermission(PermissionModule.COURSES, "view", getStatsHandler);
