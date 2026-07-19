import {
  getRoleDetail,
  normalizePermissionsPayload,
  parseRoleParam,
  updateRolePermissions,
} from "@/lib/admin-role-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getRole = async (
  _request: Request,
  { params }: { params: Promise<{ role: string }> },
) => {
  try {
    const { role } = await params;
    const detail = await getRoleDetail(parseRoleParam(role));
    return NextResponse.json({ role: detail });
  } catch (error) {
    return handleApiError(error);
  }
};

const updateRole = async (
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) => {
  try {
    const { role } = await params;
    const roleValue = parseRoleParam(role);
    const permissions = normalizePermissionsPayload(await request.json());
    const actorId = await getActorId();
    const detail = await updateRolePermissions(roleValue, permissions, actorId);
    return NextResponse.json({ role: detail });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(PermissionModule.ROLES, "view", getRole);
export const PATCH = withPermission(
  PermissionModule.ROLES,
  "edit",
  updateRole,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
