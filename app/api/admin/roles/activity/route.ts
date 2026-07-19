import { listRoleActivity } from "@/lib/admin-role-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

export const GET = withPermission(PermissionModule.ROLES, "view", async () => {
  const activity = await listRoleActivity();
  return NextResponse.json({ activity });
});
