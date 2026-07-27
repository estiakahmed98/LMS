import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  AdminActivityEntry,
  AdminActivityFilters,
  AdminActivityPage,
  AdminActivityStats,
  AuditSeverityValue,
} from "@/lib/admin-activity-types";

type AuditLogWithUser = Prisma.AuditLogGetPayload<{
  include: { user: { select: { name: true; email: true } } };
}>;

function serializeEntry(log: AuditLogWithUser): AdminActivityEntry {
  return {
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    actorId: log.userId,
    // Prefer the live user row, but fall back to the snapshot taken when the
    // action happened — that is what keeps deleted users readable in the trail.
    actorName: log.user?.name ?? log.actorLabel ?? null,
    actorEmail: log.user?.email ?? null,
    actorRole: log.actorRole,
    changes: (log.changes as Record<string, unknown> | null) ?? null,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    severity: log.severity as AuditSeverityValue,
    createdAt: log.createdAt.toISOString(),
  };
}

function buildWhere(
  filters: AdminActivityFilters,
): Prisma.AuditLogWhereInput {
  return {
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.actorId ? { userId: filters.actorId } : {}),
    ...(filters.severity ? { severity: filters.severity } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
    ...(filters.query
      ? {
          OR: [
            { action: { contains: filters.query, mode: "insensitive" } },
            { entity: { contains: filters.query, mode: "insensitive" } },
            { entityId: { contains: filters.query, mode: "insensitive" } },
            { actorLabel: { contains: filters.query, mode: "insensitive" } },
            { ipAddress: { contains: filters.query, mode: "insensitive" } },
            { user: { name: { contains: filters.query, mode: "insensitive" } } },
            { user: { email: { contains: filters.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

/**
 * Headline counts for the current filter window, so the page can lead with
 * "3 failed logins today" rather than making a reviewer scroll to find them.
 */
async function buildStats(
  where: Prisma.AuditLogWhereInput,
  total: number,
): Promise<AdminActivityStats> {
  const [critical, warning, failedLogins, deletions, actorGroups] =
    await Promise.all([
      prisma.auditLog.count({ where: { ...where, severity: "CRITICAL" } }),
      prisma.auditLog.count({ where: { ...where, severity: "WARNING" } }),
      prisma.auditLog.count({
        where: { ...where, action: "auth.login.failed" },
      }),
      prisma.auditLog.count({
        where: { ...where, action: { endsWith: ".deleted" } },
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: { ...where, userId: { not: null } },
      }),
    ]);

  return {
    total,
    critical,
    warning,
    failedLogins,
    deletions,
    distinctActors: actorGroups.length,
  };
}

export async function listActivity(
  filters: AdminActivityFilters,
): Promise<AdminActivityPage> {
  const where = buildWhere(filters);

  const [total, logs, entityRows, actionRows, actorRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    // Filter options are drawn from the whole trail, not the current filter,
    // so narrowing to one module never empties the other dropdowns.
    prisma.auditLog.findMany({
      distinct: ["entity"],
      select: { entity: true },
      orderBy: { entity: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["userId"],
      where: { userId: { not: null } },
      select: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const stats = await buildStats(where, total);

  return {
    entries: logs.map(serializeEntry),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    entities: entityRows.map((row) => row.entity),
    actions: actionRows.map((row) => row.action),
    actors: actorRows
      .map((row) => row.user)
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .sort((a, b) => a.name.localeCompare(b.name)),
    stats,
  };
}

/** Fields written to the CSV export, in column order. */
const EXPORT_COLUMNS = [
  "Timestamp (UTC)",
  "Severity",
  "Action",
  "Entity",
  "Record ID",
  "Actor",
  "Actor Email",
  "Actor Role",
  "IP Address",
  "User Agent",
  "Changes",
] as const;

/** Escapes a value for CSV, guarding against spreadsheet formula injection. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  // A leading =, +, - or @ is executed as a formula by Excel/Sheets when the
  // file is opened. Prefixing with a quote neutralises that.
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;

  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Streams the full filtered trail as CSV for compliance review and archival.
 * Ignores pagination deliberately — an export of page 1 of 40 is not an
 * export. Capped so a careless click cannot try to serialize the entire
 * table into memory at once.
 */
export async function exportActivityCsv(
  filters: Omit<AdminActivityFilters, "page" | "pageSize">,
  limit = 10_000,
): Promise<string> {
  const logs = await prisma.auditLog.findMany({
    where: buildWhere({ ...filters, page: 1, pageSize: limit }),
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const rows = logs.map((log) => {
    const entry = serializeEntry(log);
    return [
      entry.createdAt,
      entry.severity,
      entry.action,
      entry.entity,
      entry.entityId,
      entry.actorName ?? "System",
      entry.actorEmail ?? "",
      entry.actorRole ?? "",
      entry.ipAddress ?? "",
      entry.userAgent ?? "",
      entry.changes ? JSON.stringify(entry.changes) : "",
    ]
      .map(csvCell)
      .join(",");
  });

  return [EXPORT_COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");
}
