import { getAdminReportsPayload } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const instructor = await requireInstructor({
      module: PermissionModule.REPORTS,
      action: "view",
    });
    const courseIds = [...(await listInstructorAssignedCourseIds(instructor.id))];
    const payload = await getAdminReportsPayload(courseIds);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("INSTRUCTOR_REPORTS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load instructor reports." },
      { status: 500 },
    );
  }
}
