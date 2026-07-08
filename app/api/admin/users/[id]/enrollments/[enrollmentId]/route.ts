import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { unenrollUserFromCourse } from "@/lib/admin-user-server";
import { getActorId } from "@/lib/audit";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; enrollmentId: string }> },
) {
  try {
    const { id, enrollmentId } = await params;
    const actorId = await getActorId();
    const user = await unenrollUserFromCourse(id, enrollmentId, actorId);
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
