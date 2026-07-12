import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  listInstructorCourseOptions,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    const courses = await listInstructorCourseOptions(instructor.id);
    return NextResponse.json({ courses });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_COURSES_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load instructor courses." },
    { status: 500 },
  );
}
