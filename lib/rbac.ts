import { auth } from "@/auth";
import { PermissionModule, Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

export interface PermissionGrant {
  module: PermissionModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface AuthorizedAdmin {
  id: string;
  role: Role;
}

const ADMIN_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.COURSE_MANAGER,
  Role.EXAMINER,
  Role.REPORT_VIEWER,
]);

const ACTION_FIELDS: Record<
  PermissionAction,
  keyof Pick<
    PermissionGrant,
    "canView" | "canCreate" | "canEdit" | "canDelete" | "canExport"
  >
> = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
  export: "canExport",
};

export class RbacError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "RbacError";
  }
}

function allPermissions(): PermissionGrant[] {
  return Object.values(PermissionModule).map((module) => ({
    module,
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  }));
}

export async function requireAdmin(): Promise<AuthorizedAdmin> {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) {
    throw new RbacError("Authentication required.", 401);
  }

  // Read the role on every authorization check so role changes and account
  // suspension take effect immediately instead of waiting for JWT refresh.
  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true, status: true },
  });
  if (!currentUser) {
    throw new RbacError("Authentication required.", 401);
  }
  if (
    currentUser.status === "SUSPENDED" ||
    currentUser.status === "INACTIVE"
  ) {
    throw new RbacError("This account is not active.", 403);
  }

  const role = currentUser.role;
  if (!ADMIN_ROLES.has(role)) {
    throw new RbacError("Admin access required.", 403);
  }

  return { id, role };
}

export async function getAdminPermissions(
  admin?: AuthorizedAdmin,
): Promise<{ user: AuthorizedAdmin; permissions: PermissionGrant[] }> {
  const user = admin ?? (await requireAdmin());

  if (user.role === Role.SUPER_ADMIN) {
    return { user, permissions: allPermissions() };
  }

  const rows = await prisma.rolePermission.findMany({
    where: { role: user.role },
    select: {
      module: true,
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    },
  });

  const byModule = new Map(rows.map((row) => [row.module, row]));
  const permissions = Object.values(PermissionModule).map(
    (module): PermissionGrant =>
      byModule.get(module) ?? {
        module,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
      },
  );

  return { user, permissions };
}

export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction,
): Promise<AuthorizedAdmin> {
  const user = await requireAdmin();
  if (user.role === Role.SUPER_ADMIN) return user;

  const permission = await prisma.rolePermission.findUnique({
    where: { role_module: { role: user.role, module } },
    select: {
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
    },
  });

  if (!permission?.[ACTION_FIELDS[action]]) {
    throw new RbacError(
      `You do not have permission to ${action} ${module.toLowerCase().replaceAll("_", " ")}.`,
      403,
    );
  }

  return user;
}

export function withPermission<TArgs extends unknown[]>(
  module: PermissionModule,
  action: PermissionAction,
  handler: (...args: TArgs) => Promise<Response>,
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      await requirePermission(module, action);
      return await handler(...args);
    } catch (error) {
      if (error instanceof RbacError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  };
}
