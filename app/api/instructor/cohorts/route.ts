import { listLiveClassCohortOptions } from "@/lib/admin-class-server";
import {
  InstructorAuthError,
  requireInstructor,
} from "@/lib/instructor-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const instructor = await requireInstructor();
    return NextResponse.json({
      cohorts: await listLiveClassCohortOptions(instructor.id),
    });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("INSTRUCTOR_COHORT_OPTIONS_ERROR", error);
    return NextResponse.json({ error: "Failed to load cohort options." }, { status: 500 });
  }
}
