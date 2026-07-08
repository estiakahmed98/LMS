import { NextResponse } from "next/server";
import {
  InstructorAuthError,
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
