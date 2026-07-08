import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type {
  AdminActivityEntry,
  AdminActivityFilters,
  AdminActivityPage,
} from "@/lib/admin-activity-types";

function serializeEntry(
  log: Prisma.AuditLogGetPayload<{ include: { user: { select: { name: true; email: true } } } }>,
): AdminActivityEntry {
  return {
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    actorId: log.userId,
    actorName: log.user?.name ?? null,
    actorEmail: log.user?.email ?? null,
    changes: (log.changes as Record<string, unknown> | null) ?? null,
    createdAt: log.createdAt.toISOString(),
  };
}

export async function listActivity(filters: AdminActivityFilters): Promise<AdminActivityPage> {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.entity ? { entity: filters.entity } : {}),
    ...(filters.action ? { action: filters.action } : {}),
    ...(filters.actorId ? { userId: filters.actorId } : {}),
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
            { user: { name: { contains: filters.query, mode: "insensitive" } } },
            { user: { email: { contains: filters.query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, logs, entityRows, actionRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
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
  ]);

  return {
    entries: logs.map(serializeEntry),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    entities: entityRows.map((row) => row.entity),
    actions: actionRows.map((row) => row.action),
  };
}
