import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  listInstructorSessions,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    const sessions = await listInstructorSessions(instructor.id);
    return NextResponse.json({ sessions });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_SESSIONS_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load instructor sessions." },
    { status: 500 },
  );
}
