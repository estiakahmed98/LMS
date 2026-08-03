import { exportAdminReportCsv } from "@/lib/admin-report-server";
import { auditLogEntry, AuditSeverity } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const instructor = await requireInstructor({
      module: PermissionModule.REPORTS,
      action: "export",
    });
    const { searchParams } = new URL(request.url);
    const report = searchParams.get("report") ?? "mcq";
    const selectedCourseId = searchParams.get("courseId");
    const assignedCourseIds = [
      ...(await listInstructorAssignedCourseIds(instructor.id)),
    ];
    const courseIds =
      selectedCourseId && assignedCourseIds.includes(selectedCourseId)
        ? [selectedCourseId]
        : assignedCourseIds;
    const csv = await exportAdminReportCsv(report, courseIds);

    await auditLogEntry({
      actorId: instructor.id,
      action: "instructorReports.exported",
      entity: "Report",
      entityId: report,
      severity: AuditSeverity.NOTICE,
      changes: { report, format: "CSV", courseIds },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="instructor-${report}-report-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("INSTRUCTOR_REPORTS_EXPORT_ERROR", error);
    return NextResponse.json(
      { error: "Failed to export instructor report." },
      { status: 500 },
    );
  }
}
