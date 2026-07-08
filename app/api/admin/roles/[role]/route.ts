import {
  getRoleDetail,
  normalizePermissionsPayload,
  parseRoleParam,
  updateRolePermissions,
} from "@/lib/admin-role-server";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  try {
    const { role } = await params;
    const detail = await getRoleDetail(parseRoleParam(role));
    return NextResponse.json({ role: detail });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  try {
    const { role } = await params;
    const roleValue = parseRoleParam(role);
    const permissions = normalizePermissionsPayload(await request.json());
    const detail = await updateRolePermissions(roleValue, permissions, null);
    return NextResponse.json({ role: detail });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
