export const ROLE_VALUES = [
  "SUPER_ADMIN",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
  "INSTRUCTOR",
  "STUDENT",
] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];

export type PermissionModuleValue =
  | "STUDENTS"
  | "COURSES"
  | "ASSESSMENTS"
  | "SUBMISSIONS"
  | "GRADING"
  | "CERTIFICATES"
  | "REPORTS"
  | "SETTINGS"
  | "ROLES"
  | "QUESTION_BANK";

export interface AdminRolePermissionRow {
  module: PermissionModuleValue;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  updatedAt: string;
}

export interface AdminRoleUser {
  id: string;
  name: string;
  email: string;
  status: string;
  lastActive: string | null;
}

export interface AdminRoleSummary {
  role: RoleValue;
  isSystemRole: boolean;
  userCount: number;
  enabledModuleCount: number;
  totalModuleCount: number;
  updatedAt: string | null;
}

export interface AdminRoleDetail extends AdminRoleSummary {
  permissions: AdminRolePermissionRow[];
  users: AdminRoleUser[];
}

export interface AdminRolePermissionUpdate {
  module: PermissionModuleValue;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export interface AdminRolePermissionsPayload {
  permissions: AdminRolePermissionUpdate[];
}

export interface AdminRoleActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorName: string | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
}
