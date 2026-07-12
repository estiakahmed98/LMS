import { NextResponse } from "next/server";
import { listInstructorRecordings } from "@/lib/instructor-recording-server";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    const recordings = await listInstructorRecordings(instructor.id);
    return NextResponse.json({ recordings });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("INSTRUCTOR_RECORDINGS_ERROR", error);
    return NextResponse.json({ error: "Failed to load recordings." }, { status: 500 });
  }
}
