export type AdminCohortStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
export type BatchInstructorRoleValue = "LEAD" | "ASSISTANT" | "MAKER" | "CHECKER";

export interface AdminCohortInstructorAssignment {
  id: string;
  batchCourseId: string;
  instructorId: string;
  instructorName: string;
  instructorEmail: string;
  role: BatchInstructorRoleValue;
  status: "ACTIVE" | "ARCHIVED";
}

export interface AdminCohortSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: AdminCohortStatus;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  timezone: string;
  courseCount: number;
  memberCount: number;
  enrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCohortCourse {
  mappingId: string;
  id: string;
  title: string;
  status: string;
  enrollmentCount: number;
  instructors: AdminCohortInstructorAssignment[];
}

export interface AdminCohortMember {
  membershipId: string;
  id: string;
  name: string;
  email: string;
  accountStatus: string;
  membershipStatus: "ACTIVE" | "WITHDRAWN";
  joinedAt: string;
  leftAt: string | null;
  enrollmentCount: number;
}

export interface AdminCohortDetail extends AdminCohortSummary {
  courses: AdminCohortCourse[];
  members: AdminCohortMember[];
}

export interface AdminCohortCatalogCourse {
  id: string;
  title: string;
  status: string;
  level: string;
}

export interface AdminCohortCatalogLearner {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface AdminCohortCatalogInstructor {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface AdminCohortInstructorInput {
  batchCourseId: string;
  instructorId: string;
  role: BatchInstructorRoleValue;
}

export interface AdminCohortWorkspace {
  cohort: AdminCohortDetail;
  catalog: {
    courses: AdminCohortCatalogCourse[];
    learners: AdminCohortCatalogLearner[];
    instructors: AdminCohortCatalogInstructor[];
  };
}

export interface AdminCohortPayload {
  code: string;
  name: string;
  description: string | null;
  status: AdminCohortStatus;
  startDate: string | null;
  endDate: string | null;
  capacity: number | null;
  timezone: string;
}
