import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  requireInstructor,
  startInstructorSession,
} from "@/lib/instructor-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor({
      module: "COURSES",
      action: "edit",
    });
    const { id } = await context.params;
    const session = await startInstructorSession(instructor.id, id);
    return NextResponse.json({ session });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_START_SESSION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to start session." },
    { status: 500 },
  );
}
