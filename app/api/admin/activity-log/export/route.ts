import { exportActivityCsv } from "@/lib/admin-activity-server";
import type { AuditSeverityValue } from "@/lib/admin-activity-types";
import { auditLogEntry, getActorId, AuditSeverity } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const SEVERITIES: AuditSeverityValue[] = [
  "INFO",
  "NOTICE",
  "WARNING",
  "CRITICAL",
];

function parseSeverity(value: string | null): AuditSeverityValue | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase() as AuditSeverityValue;
  return SEVERITIES.includes(upper) ? upper : undefined;
}

/**
 * CSV export of the filtered audit trail.
 *
 * Exporting the trail is itself an audited event: taking a copy of who-did-what
 * out of the system is exactly the kind of action a reviewer needs to see.
 */
const exportHandler = async (request: Request) => {
  const { searchParams } = new URL(request.url);

  const filters = {
    entity: searchParams.get("entity") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    actorId: searchParams.get("actorId") ?? undefined,
    severity: parseSeverity(searchParams.get("severity")),
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    query: searchParams.get("query") ?? undefined,
  };

  const csv = await exportActivityCsv(filters);
  const actorId = await getActorId();

  await auditLogEntry({
    actorId,
    action: "activityLog.exported",
    entity: "AuditLog",
    entityId: "export",
    severity: AuditSeverity.WARNING,
    changes: { filters },
  });

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-log-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
};

export const GET = withPermission(
  PermissionModule.ROLES,
  "export",
  exportHandler,
);
