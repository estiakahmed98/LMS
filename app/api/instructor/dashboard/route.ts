import { NextResponse } from "next/server";
import {
  getInstructorDashboard,
  InstructorAuthError,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    const dashboard = await getInstructorDashboard(instructor.id);
    return NextResponse.json(dashboard, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_DASHBOARD_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load instructor dashboard." },
    { status: 500 },
  );
}
