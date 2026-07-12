import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  getInstructorAttendanceSummary,
  getInstructorParticipants,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET(request: Request) {
  try {
    const instructor = await requireInstructor();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    const payload = await getInstructorParticipants(instructor.id, sessionId);
    const summary = await getInstructorAttendanceSummary(instructor.id);
    return NextResponse.json({ ...payload, summary });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_PARTICIPANTS_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load participants." },
    { status: 500 },
  );
}
