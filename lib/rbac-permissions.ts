import type { PermissionModule } from "@/lib/generated/prisma/enums";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "export";

export interface PermissionGrant {
  module: PermissionModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

type PermissionFlags = Omit<PermissionGrant, "module">;

const ACTION_FIELDS = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
  export: "canExport",
} as const satisfies Record<PermissionAction, keyof PermissionFlags>;

export function hasPermission(
  permission: PermissionFlags | null | undefined,
  action: PermissionAction,
): boolean {
  return Boolean(permission?.[ACTION_FIELDS[action]]);
}
