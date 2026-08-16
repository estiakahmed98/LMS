import { listLiveClassCohortOptions } from "@/lib/admin-class-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getHandler = async () => {
  return NextResponse.json({ cohorts: await listLiveClassCohortOptions() });
};

export const GET = withPermission(PermissionModule.COURSES, "view", getHandler);
