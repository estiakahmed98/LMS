import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  deleteInstructorClass,
  getInstructorClassForEdit,
  InstructorAuthError,
  requireInstructor,
  updateInstructorClass,
} from "@/lib/instructor-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor();
    const { id } = await context.params;
    const liveClass = await getInstructorClassForEdit(instructor.id, id);
    return NextResponse.json({ class: liveClass });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor();
    const { id } = await context.params;
    const liveClass = await updateInstructorClass(
      instructor.id,
      id,
      await request.json(),
    );
    return NextResponse.json({ class: liveClass });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor();
    const { id } = await context.params;
    await deleteInstructorClass(instructor.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return NextResponse.json(
      { error: "Selected course does not exist." },
      { status: 409 },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("INSTRUCTOR_CLASS_DETAIL_ERROR", error);
  return NextResponse.json({ error: "Failed to update class." }, { status: 500 });
}
