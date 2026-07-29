import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import type {
  AdminRoleActivityEntry,
  AdminRoleDetail,
  AdminRolePermissionUpdate,
  AdminRoleSummary,
  PermissionModuleValue,
  RoleValue,
} from "@/lib/admin-role-types";
import {
  modulesForRole,
  PERMISSION_MODULE_VALUES,
  ROLE_VALUES,
} from "@/lib/admin-role-types";
import { PermissionModule, Role } from "@/lib/generated/prisma/enums";

export const editableRoles: RoleValue[] = [...ROLE_VALUES];

export const permissionModuleOrder: PermissionModuleValue[] = [
  ...PERMISSION_MODULE_VALUES,
];

function isPermissionEnabled(row: {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}) {
  return (
    row.canView ||
    row.canCreate ||
    row.canEdit ||
    row.canDelete ||
    row.canExport
  );
}

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

function fullPermissionRow(module: PermissionModuleValue) {
  return {
    module,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
    updatedAt: new Date().toISOString(),
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
    const scopedModules = new Set(modulesForRole(role));
    if (role === "SUPER_ADMIN") {
      return {
        role,
        isSystemRole: true,
        userCount: userCountMap.get(role) ?? 0,
        enabledModuleCount: scopedModules.size,
        totalModuleCount: scopedModules.size,
        updatedAt: null,
      };
    }

    const rows = permissionRows.filter(
      (row) => row.role === role && scopedModules.has(row.module as PermissionModuleValue),
    );
    const enabledModuleCount = rows.filter(isPermissionEnabled).length;
    const latestUpdate = rows
      .map((row) => row.updatedAt.getTime())
      .sort((a, b) => b - a)[0];

    return {
      role,
      isSystemRole: false,
      userCount: userCountMap.get(role) ?? 0,
      enabledModuleCount,
      totalModuleCount: scopedModules.size,
      updatedAt: latestUpdate ? new Date(latestUpdate).toISOString() : null,
    };
  });
}

export async function getRoleDetail(role: RoleValue): Promise<AdminRoleDetail> {
  if (role === "SUPER_ADMIN") {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true, name: true, email: true, status: true, lastActive: true },
      orderBy: { name: "asc" },
    });
    const permissions = permissionModuleOrder.map(fullPermissionRow);

    return {
      role,
      isSystemRole: true,
      userCount: users.length,
      enabledModuleCount: permissions.length,
      totalModuleCount: permissions.length,
      updatedAt: null,
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

  const [permissionRows, users] = await Promise.all([
    prisma.rolePermission.findMany({ where: { role } }),
    prisma.user.findMany({
      where: { role },
      select: { id: true, name: true, email: true, status: true, lastActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rowMap = new Map(permissionRows.map((row) => [row.module, row]));
  const scopedModules = modulesForRole(role);
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
    (row) =>
      scopedModules.includes(row.module) && isPermissionEnabled(row),
  ).length;
  const latestUpdate = permissionRows
    .map((row) => row.updatedAt.getTime())
    .sort((a, b) => b - a)[0];

  return {
    role,
    isSystemRole: false,
    userCount: users.length,
    enabledModuleCount,
    totalModuleCount: scopedModules.length,
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

  const seenModules = new Set<string>();

  return payload.permissions.map((entry) => {
    const row = (entry ?? {}) as Partial<AdminRolePermissionUpdate>;
    const module = String(row.module ?? "").toUpperCase();
    if (!Object.values(PermissionModule).includes(module as PermissionModule)) {
      throw new Error(`Invalid module: ${row.module}`);
    }
    if (seenModules.has(module)) {
      throw new Error(`Duplicate module: ${module}`);
    }
    seenModules.add(module);

    const canCreate = Boolean(row.canCreate);
    const canEdit = Boolean(row.canEdit);
    const canDelete = Boolean(row.canDelete);
    const canExport = Boolean(row.canExport);

    return {
      module: module as PermissionModuleValue,
      // Any write/export capability requires visibility of that module.
      canView:
        Boolean(row.canView) ||
        canCreate ||
        canEdit ||
        canDelete ||
        canExport,
      canCreate,
      canEdit,
      canDelete,
      canExport,
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

  // Capture the previous grants so the trail shows which permission actually
  // changed, not just that "permissions were updated".
  const before = await prisma.rolePermission.findMany({
    where: { role },
    select: {
      module: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    },
  });

  await prisma.$transaction(
    rows.map((row) =>
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
  );

  // Audited outside the transaction: a logging failure must never roll back a
  // permission change that already succeeded.
  const beforeByModule = new Map(before.map((row) => [row.module, row]));
  const grantDiff: Record<string, { from: unknown; to: unknown }> = {};

  for (const row of rows) {
    const previous = beforeByModule.get(row.module as PermissionModule);
    for (const key of ["canView", "canCreate", "canEdit", "canDelete", "canExport"] as const) {
      const from = previous?.[key] ?? false;
      const to = row[key];
      if (from !== to) {
        grantDiff[`${row.module}.${key}`] = { from, to };
      }
    }
  }

  if (Object.keys(grantDiff).length > 0) {
    await auditLogEntry({
      actorId,
      action: "permissions.updated",
      entity: "RolePermission",
      entityId: role,
      changes: grantDiff,
    });
  }

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

  await prisma.user.update({ where: { id: userId }, data: { role } });

  // Audited after the fact so a logging failure cannot undo the role change.
  await auditLogEntry({
    actorId,
    action: "role.assigned",
    entity: "User",
    entityId: userId,
    changes: { role: { from: previousRole, to: role } },
  });

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

  await prisma.user.update({ where: { id: userId }, data: { role: "STUDENT" } });

  await auditLogEntry({
    actorId,
    action: "role.unassigned",
    entity: "User",
    entityId: userId,
    changes: { role: { from: role, to: "STUDENT" } },
  });

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
