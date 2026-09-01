import { listClassOptions } from "@/lib/admin-class-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getOptionsHandler = async () => {
  const classes = await listClassOptions();
  return NextResponse.json({ classes });
};

export const GET = withPermission(PermissionModule.COURSES, "view", getOptionsHandler);
