export const ROLE_VALUES = [
  "SUPER_ADMIN",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
  "INSTRUCTOR",
  "STUDENT",
] as const;

export type RoleValue = (typeof ROLE_VALUES)[number];

export const PERMISSION_MODULE_VALUES = [
  "STUDENTS",
  "COURSES",
  "ASSESSMENTS",
  "QUESTION_BANK",
  "SUBMISSIONS",
  "GRADING",
  "CERTIFICATES",
  "REPORTS",
  "SETTINGS",
  "ROLES",
] as const;

export type PermissionModuleValue = (typeof PERMISSION_MODULE_VALUES)[number];

/** Modules that actually drive the Instructor portal UI/API. */
export const INSTRUCTOR_PORTAL_MODULES = [
  "COURSES",
  "REPORTS",
  "SETTINGS",
] as const satisfies readonly PermissionModuleValue[];

/** Modules that actually drive the Student portal UI/API. */
export const STUDENT_PORTAL_MODULES = [
  "COURSES",
  "ASSESSMENTS",
  "QUESTION_BANK",
  "CERTIFICATES",
  "SETTINGS",
] as const satisfies readonly PermissionModuleValue[];

export function modulesForRole(role: RoleValue): PermissionModuleValue[] {
  void role;
  return [...PERMISSION_MODULE_VALUES];
}

export function isPortalRole(role: RoleValue): boolean {
  return role === "INSTRUCTOR" || role === "STUDENT";
}

export const MODULE_LABELS: Record<PermissionModuleValue, string> = {
  STUDENTS: "Students",
  COURSES: "Courses",
  ASSESSMENTS: "Assessments",
  QUESTION_BANK: "Question Bank",
  SUBMISSIONS: "Submissions",
  GRADING: "Grading",
  CERTIFICATES: "Certificates",
  REPORTS: "Reports",
  SETTINGS: "Settings",
  ROLES: "Roles",
};

export const INSTRUCTOR_MODULE_HINTS: Record<
  (typeof INSTRUCTOR_PORTAL_MODULES)[number],
  string
> = {
  COURSES: "Dashboard, Classes, Recordings, Schedule, Live room host tools",
  REPORTS: "Participants & attendance",
  SETTINGS: "Profile & preferences",
};

export const STUDENT_MODULE_HINTS: Record<
  (typeof STUDENT_PORTAL_MODULES)[number],
  string
> = {
  COURSES: "Dashboard, Courses, Live classes, progress",
  ASSESSMENTS: "Assessments & module quizzes",
  QUESTION_BANK: "Question Bank",
  CERTIFICATES: "Certificates",
  SETTINGS: "Profile & preferences",
};

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
