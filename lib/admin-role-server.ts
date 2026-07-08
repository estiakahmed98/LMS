import { prisma } from "@/lib/prisma";
import type {
  AdminRoleActivityEntry,
  AdminRoleDetail,
  AdminRolePermissionUpdate,
  AdminRoleSummary,
  PermissionModuleValue,
  RoleValue,
} from "@/lib/admin-role-types";
import { PermissionModule, Role } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

export const editableRoles: RoleValue[] = [
  "SUPER_ADMIN",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
];

export const permissionModuleOrder: PermissionModuleValue[] = [
  "STUDENTS",
  "COURSES",
  "ASSESSMENTS",
  "SUBMISSIONS",
  "GRADING",
  "CERTIFICATES",
  "REPORTS",
  "SETTINGS",
  "ROLES",
];

function isValidRole(role: string): role is RoleValue {
  return (editableRoles as string[]).includes(role);
}

function emptyPermissionRow(module: PermissionModuleValue) {
  return {
    module,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    updatedAt: new Date(0).toISOString(),
  };
}

export function parseRoleParam(value: string): RoleValue {
  const normalized = value.toUpperCase();
  if (!isValidRole(normalized)) {
    throw new Error("Unknown role.");
  }
  return normalized;
}

export async function listRoleSummaries(): Promise<AdminRoleSummary[]> {
  const [permissionRows, userCounts] = await Promise.all([
    prisma.rolePermission.findMany(),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
      where: { role: { in: editableRoles as Role[] } },
    }),
  ]);

  const userCountMap = new Map(userCounts.map((row) => [row.role, row._count._all]));

  return editableRoles.map((role) => {
    const rows = permissionRows.filter((row) => row.role === role);
    const enabledModuleCount = rows.filter(
      (row) => row.canView || row.canCreate || row.canEdit || row.canDelete || row.canExport,
    ).length;
    const latestUpdate = rows
      .map((row) => row.updatedAt.getTime())
      .sort((a, b) => b - a)[0];

    return {
      role,
      isSystemRole: role === "SUPER_ADMIN",
      userCount: userCountMap.get(role) ?? 0,
      enabledModuleCount,
      totalModuleCount: permissionModuleOrder.length,
      updatedAt: latestUpdate ? new Date(latestUpdate).toISOString() : null,
    };
  });
}

export async function getRoleDetail(role: RoleValue): Promise<AdminRoleDetail> {
  const [permissionRows, users] = await Promise.all([
    prisma.rolePermission.findMany({ where: { role } }),
    prisma.user.findMany({
      where: { role },
      select: { id: true, name: true, email: true, status: true, lastActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rowMap = new Map(permissionRows.map((row) => [row.module, row]));
  const permissions = permissionModuleOrder.map((module) => {
    const row = rowMap.get(module as PermissionModule);
    return row
      ? {
          module,
          canView: row.canView,
          canCreate: row.canCreate,
          canEdit: row.canEdit,
          canDelete: row.canDelete,
          canExport: row.canExport,
          updatedAt: row.updatedAt.toISOString(),
        }
      : emptyPermissionRow(module);
  });

  const enabledModuleCount = permissions.filter(
    (row) => row.canView || row.canCreate || row.canEdit || row.canDelete || row.canExport,
  ).length;
  const latestUpdate = permissionRows
    .map((row) => row.updatedAt.getTime())
    .sort((a, b) => b - a)[0];

  return {
    role,
    isSystemRole: role === "SUPER_ADMIN",
    userCount: users.length,
    enabledModuleCount,
    totalModuleCount: permissionModuleOrder.length,
    updatedAt: latestUpdate ? new Date(latestUpdate).toISOString() : null,
    permissions,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      lastActive: user.lastActive ? user.lastActive.toISOString() : null,
    })),
  };
}

export function normalizePermissionsPayload(input: unknown): AdminRolePermissionUpdate[] {
  const payload = (input ?? {}) as { permissions?: unknown };
  if (!Array.isArray(payload.permissions)) {
    throw new Error("Permissions payload must be an array.");
  }

  return payload.permissions.map((entry) => {
    const row = (entry ?? {}) as Partial<AdminRolePermissionUpdate>;
    const module = String(row.module ?? "").toUpperCase();
    if (!Object.values(PermissionModule).includes(module as PermissionModule)) {
      throw new Error(`Invalid module: ${row.module}`);
    }
    return {
      module: module as PermissionModuleValue,
      canView: Boolean(row.canView),
      canCreate: Boolean(row.canCreate),
      canEdit: Boolean(row.canEdit),
      canDelete: Boolean(row.canDelete),
      canExport: Boolean(row.canExport),
    };
  });
}

export async function updateRolePermissions(
  role: RoleValue,
  rows: AdminRolePermissionUpdate[],
  actorId: string | null,
) {
  if (role === "SUPER_ADMIN") {
    throw new Error("Super Admin permissions cannot be modified.");
  }

  await prisma.$transaction([
    ...rows.map((row) =>
      prisma.rolePermission.upsert({
        where: { role_module: { role, module: row.module as PermissionModule } },
        update: {
          canView: row.canView,
          canCreate: row.canCreate,
          canEdit: row.canEdit,
          canDelete: row.canDelete,
          canExport: row.canExport,
        },
        create: {
          role,
          module: row.module as PermissionModule,
          canView: row.canView,
          canCreate: row.canCreate,
          canEdit: row.canEdit,
          canDelete: row.canDelete,
          canExport: row.canExport,
        },
      }),
    ),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "permissions.updated",
        entity: "RolePermission",
        entityId: role,
        changes: JSON.parse(JSON.stringify({ role, permissions: rows })) as Prisma.InputJsonValue,
      },
    }),
  ]);

  return getRoleDetail(role);
}

export async function assignUserToRole(
  userId: string,
  role: RoleValue,
  actorId: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found.");
  }

  const previousRole = user.role;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role } }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "role.assigned",
        entity: "User",
        entityId: userId,
        changes: { from: previousRole, to: role } as Prisma.InputJsonValue,
      },
    }),
  ]);

  return getRoleDetail(role);
}

export async function unassignUserFromRole(
  userId: string,
  role: RoleValue,
  actorId: string | null,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== role) {
    throw new Error("User is not assigned to this role.");
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } }),
    prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "role.unassigned",
        entity: "User",
        entityId: userId,
        changes: { from: role, to: "STUDENT" } as Prisma.InputJsonValue,
      },
    }),
  ]);

  return getRoleDetail(role);
}

export async function listRoleActivity(limit = 20): Promise<AdminRoleActivityEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "RolePermission" },
        { action: { in: ["role.assigned", "role.unassigned"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true } } },
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    actorName: log.user?.name ?? null,
    changes: (log.changes as Record<string, unknown> | null) ?? null,
    createdAt: log.createdAt.toISOString(),
  }));
}
