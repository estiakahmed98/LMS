import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  AdminActivityActor,
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

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  const stats = await buildStats(where, total);

  return {
    entries: logs.map(serializeEntry),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    stats,
  };
}

const TYPEAHEAD_LIMIT = 20;

/**
 * Searchable, bounded lookups for the filter dropdowns. Unlike a plain
 * `distinct` scan over the whole audit_logs table (which gets slower every
 * year as history accumulates), these use the indexed columns and cap the
 * result set — the dropdown becomes a typeahead instead of a full list.
 */
export async function searchActivityEntities(search?: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: search?.trim() ? { entity: { contains: search.trim(), mode: "insensitive" } } : {},
    distinct: ["entity"],
    select: { entity: true },
    orderBy: { entity: "asc" },
    take: TYPEAHEAD_LIMIT,
  });
  return rows.map((row) => row.entity);
}

export async function searchActivityActions(search?: string): Promise<string[]> {
  const rows = await prisma.auditLog.findMany({
    where: search?.trim() ? { action: { contains: search.trim(), mode: "insensitive" } } : {},
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
    take: TYPEAHEAD_LIMIT,
  });
  return rows.map((row) => row.action);
}

export interface AdminActivityActorProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string | null;
}

/**
 * Header info + headline counts for one actor's "what did this user do"
 * drill-down page. Counts are scoped to just this user's audit rows (backed
 * by the userId index) so they stay cheap no matter how large the overall
 * trail grows.
 */
export async function getActivityActorProfile(
  userId: string,
): Promise<AdminActivityActorProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true, lastActive: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastActive: user.lastActive?.toISOString() ?? null,
  };
}

export async function searchActivityActors(search?: string): Promise<AdminActivityActor[]> {
  const rows = await prisma.user.findMany({
    where: {
      auditLogs: { some: {} },
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search.trim(), mode: "insensitive" } },
              { email: { contains: search.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: TYPEAHEAD_LIMIT,
  });
  return rows;
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
