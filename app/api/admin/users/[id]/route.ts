import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  deleteUser,
  getUserById,
  normalizeStatusUpdatePayload,
  normalizeUserUpdatePayload,
  updateUser,
  updateUserStatus,
} from "@/lib/admin-user-server";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const getUserHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
};

const updateUserHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    const actorId = await getActorId();

    if (body && typeof body.status === "string" && Object.keys(body).length === 1) {
      const payload = normalizeStatusUpdatePayload(body);
      const user = await updateUserStatus(id, payload.status, actorId);
      return NextResponse.json({ user });
    }

    const payload = normalizeUserUpdatePayload(body);
    const user = await updateUser(id, payload, actorId);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
};

const deleteUserHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const actorId = await getActorId();
    await deleteUser(id, actorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.STUDENTS,
  "view",
  getUserHandler,
);
export const PATCH = withPermission(
  PermissionModule.STUDENTS,
  "edit",
  updateUserHandler,
);
export const DELETE = withPermission(
  PermissionModule.STUDENTS,
  "delete",
  deleteUserHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "This user cannot be deleted because related records still depend on them.",
        },
        { status: 409 },
      );
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
