import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  InstructorAuthError,
  createInstructorClass,
  listInstructorClasses,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    const classes = await listInstructorClasses(instructor.id);
    return NextResponse.json({ classes });
  } catch (error) {
    return handleInstructorError(error);
  }
}

export async function POST(request: Request) {
  try {
    const instructor = await requireInstructor();
    const liveClass = await createInstructorClass(instructor.id, await request.json());
    const primarySession = [...liveClass.sessions].sort(
      (a, b) =>
        new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
    )[0];

    return NextResponse.json(
      { class: liveClass, session: primarySession ?? null },
      { status: 201 },
    );
  } catch (error) {
    return handleCreateError(error);
  }
}

function handleCreateError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Selected course does not exist." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("INSTRUCTOR_CREATE_CLASS_ERROR", error);
  return NextResponse.json(
    { error: "Failed to create class." },
    { status: 500 },
  );
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_CLASSES_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load instructor classes." },
    { status: 500 },
  );
}
