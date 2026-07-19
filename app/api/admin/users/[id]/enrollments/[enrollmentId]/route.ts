import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  normalizeEnrollmentUpdatePayload,
  unenrollUserFromCourse,
  updateUserEnrollment,
} from "@/lib/admin-user-server";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const updateEnrollmentHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) => {
  try {
    const { id, enrollmentId } = await params;
    const body = await request.json();
    const payload = normalizeEnrollmentUpdatePayload(body);
    const actorId = await getActorId();
    const user = await updateUserEnrollment(id, enrollmentId, payload, actorId);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
};

const deleteEnrollmentHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) => {
  try {
    const { id, enrollmentId } = await params;
    const actorId = await getActorId();
    const user = await unenrollUserFromCourse(id, enrollmentId, actorId);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
};

export const PATCH = withPermission(
  PermissionModule.STUDENTS,
  "edit",
  updateEnrollmentHandler,
);
export const DELETE = withPermission(
  PermissionModule.STUDENTS,
  "delete",
  deleteEnrollmentHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
