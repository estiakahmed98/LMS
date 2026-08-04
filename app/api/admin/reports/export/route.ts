import { exportAdminReportCsv } from "@/lib/admin-report-server";
import { auditLogEntry, AuditSeverity, getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const exportHandler = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const report = searchParams.get("report") ?? "overview";
    const courseId = searchParams.get("courseId");
    const csv = await exportAdminReportCsv(
      report,
      courseId ? [courseId] : undefined,
    );
    const actorId = await getActorId();

    await auditLogEntry({
      actorId,
      action: "reports.exported",
      entity: "Report",
      entityId: report,
      severity: AuditSeverity.NOTICE,
      changes: { report, courseId, format: "CSV" },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${report}-report-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ADMIN_REPORTS_EXPORT_ERROR", error);
    return NextResponse.json(
      { error: "Failed to export report." },
      { status: 500 },
    );
  }
};

export const GET = withPermission(
  PermissionModule.REPORTS,
  "export",
  exportHandler,
);
