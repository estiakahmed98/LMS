export type LearnerEnrollmentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";

export type LearnerSubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "GRADING"
  | "GRADED"
  | "REVIEWED";

export type LearnerNotificationType = "INFO" | "WARNING" | "SUCCESS" | "ERROR";

export interface LearnerDashboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LearnerDashboardCourseModule {
  id: string;
  title: string;
}

export interface LearnerDashboardCourse {
  id: string;
  title: string;
  description: string;
  durationHours: number;
  coverImage: string | null;
  modules: LearnerDashboardCourseModule[];
}

export interface LearnerDashboardCertificate {
  id: string;
  courseId: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: string;
}

export interface LearnerDashboardEnrollment {
  id: string;
  status: LearnerEnrollmentStatus;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
  course: LearnerDashboardCourse;
  certificate: {
    id: string;
    certificateNumber: string;
  } | null;
}

export interface LearnerDashboardSubmission {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  courseId: string;
  courseTitle: string;
  status: LearnerSubmissionStatus;
  obtainedMarks: number | null;
  submittedAt: string | null;
}

export interface LearnerDashboardNotification {
  id: string;
  title: string;
  message: string;
  type: LearnerNotificationType;
  readAt: string | null;
  createdAt: string;
}

export interface LearnerDashboardSummary {
  enrollmentCount: number;
  approvedEnrollmentCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  avgProgress: number;
  pendingAssessments: number;
  certificateCount: number;
}

export interface LearnerDashboardPayload {
  user: LearnerDashboardUser;
  enrollments: LearnerDashboardEnrollment[];
  certificates: LearnerDashboardCertificate[];
  submissions: LearnerDashboardSubmission[];
  notifications: LearnerDashboardNotification[];
  summary: LearnerDashboardSummary;
}
