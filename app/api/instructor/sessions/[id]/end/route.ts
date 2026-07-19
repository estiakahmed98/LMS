import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  endInstructorSession,
  requireInstructor,
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
    const session = await endInstructorSession(instructor.id, id);
    return NextResponse.json({ session });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_END_SESSION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to end session." },
    { status: 500 },
  );
}
