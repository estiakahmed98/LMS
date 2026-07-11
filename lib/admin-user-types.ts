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

export type EnrollmentStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";
export type SubmissionStatusValue =
  | "DRAFT"
  | "SUBMITTED"
  | "GRADING"
  | "GRADED"
  | "REVIEWED";
export type NotificationTypeValue = "INFO" | "WARNING" | "SUCCESS" | "ERROR";
export type LiveClassStatusValue = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MeetingTypeValue = "VIDEO_CONFERENCE" | "WEBINAR" | "AUDIO_ONLY";
export type RecurrencePatternValue = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
export type SessionStatusValue = "UPCOMING" | "LIVE" | "COMPLETED" | "MISSED" | "CANCELLED";
export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE";

export interface AdminUserCourseSummary {
  id: string;
  title: string;
}

export interface AdminUserEnrollment {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  status: EnrollmentStatusValue;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
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

export interface AdminUserProfile {
  dateOfBirth: string | null;
  nidNumber: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

export interface AdminUserDetail extends AdminUserSummary {
  phone: string | null;
  photoUrl: string | null;
  hasPassword: boolean;
  profile: AdminUserProfile;
  enrollments: AdminUserEnrollment[];
  submissions: AdminUserSubmission[];
  certificates: AdminUserCertificate[];
  notifications: AdminUserNotification[];
  auditLogs: AdminUserAuditLog[];
  videoProgress: AdminUserVideoProgress[];
  liveClasses: AdminUserLiveClass[];
  attendances: AdminUserAttendance[];
}

export interface AdminUserUpdatePayload {
  name: string;
  email: string;
  role: UserRoleValue;
  status?: UserStatusValue;
  phone?: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  nidNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  password?: string;
}

export interface AdminUserEnrollmentUpdatePayload {
  status: EnrollmentStatusValue;
  progress: number;
  completedAt?: string | null;
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

export interface AdminUserSubmission {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  courseId: string;
  courseTitle: string;
  status: SubmissionStatusValue;
  obtainedMarks: number | null;
  totalMarks: number;
  submittedAt: string | null;
  gradedAt: string | null;
  answerSheetUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserCertificate {
  id: string;
  courseId: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: string;
  createdAt: string;
}

export interface AdminUserNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationTypeValue;
  readAt: string | null;
  createdAt: string;
}

export interface AdminUserAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: unknown;
  createdAt: string;
}

export interface AdminUserVideoProgress {
  id: string;
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  positionSeconds: number;
  durationSeconds: number;
  watchedPercent: number;
  completed: boolean;
  updatedAt: string;
}

export interface AdminUserLiveClassSession {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: SessionStatusValue;
  recordingUrl: string | null;
  recordingSizeMb: number | null;
  attendanceCount: number;
}

export interface AdminUserLiveClass {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  subjectName: string;
  batchName: string;
  status: LiveClassStatusValue;
  meetingType: MeetingTypeValue;
  recurrence: RecurrencePatternValue;
  durationMinutes: number;
  meetingLink: string;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  autoAttendanceEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  sessions: AdminUserLiveClassSession[];
}

export interface AdminUserAttendance {
  id: string;
  status: AttendanceStatusValue;
  joinTime: string | null;
  leaveTime: string | null;
  durationMinutes: number | null;
  speakTimeSeconds: number | null;
  sessionId: string;
  scheduledStart: string;
  scheduledEnd: string;
  sessionStatus: SessionStatusValue;
  liveClassId: string;
  liveClassTitle: string;
  courseId: string;
  courseTitle: string;
}
