import { PermissionModule } from "@/lib/generated/prisma/enums";
import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import { getInstructorReportsPage } from "@/lib/instructor-report-server";
import type { AdminReportType } from "@/lib/admin-report-types";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const instructor = await requireInstructor({
      module: PermissionModule.REPORTS,
      action: "view",
    });
    const courseIds = [...(await listInstructorAssignedCourseIds(instructor.id))];
    const params = new URL(request.url).searchParams;
    const numberParam = (key: string) => {
      const value = Number(params.get(key));
      return Number.isInteger(value) && value > 0 ? value : undefined;
    };
    const payload = await getInstructorReportsPage(courseIds, {
      report: (params.get("report") ?? "overview") as AdminReportType,
      courseId: params.get("courseId") ?? undefined,
      assessmentType: params.get("assessmentType") ?? undefined,
      page: numberParam("page"),
      pageSize: numberParam("pageSize"),
    });
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
