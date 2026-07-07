export type UserRoleValue =
  | "SUPER_ADMIN"
  | "COURSE_MANAGER"
  | "EXAMINER"
  | "REPORT_VIEWER"
  | "INSTRUCTOR"
  | "STUDENT";

export type UserStatusValue =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ACTIVE"
  | "INACTIVE";

export interface AdminUserCourseSummary {
  id: string;
  title: string;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRoleValue;
  status: UserStatusValue;
  lastActive: string | null;
  createdAt: string;
  enrollmentCount: number;
  courses: AdminUserCourseSummary[];
}

export interface AdminUserDetail extends AdminUserSummary {
  phone: string | null;
}

export interface AdminUserUpdatePayload {
  name: string;
  email: string;
  role: UserRoleValue;
  phone?: string;
}

export interface AdminUserCreatePayload {
  name: string;
  email: string;
  password: string;
  role: UserRoleValue;
  phone?: string;
}

export interface AdminUserStatusUpdatePayload {
  status: UserStatusValue;
}
