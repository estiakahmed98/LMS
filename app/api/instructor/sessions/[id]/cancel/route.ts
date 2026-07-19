import { NextResponse } from "next/server";
import {
  cancelInstructorSession,
  InstructorAuthError,
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
    const session = await cancelInstructorSession(instructor.id, id);
    return NextResponse.json({ session });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_CANCEL_SESSION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to cancel session." },
    { status: 500 },
  );
}
