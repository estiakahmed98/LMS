export type LiveClassStatusValue = "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MeetingTypeValue = "VIDEO_CONFERENCE" | "WEBINAR" | "AUDIO_ONLY";
export type RecurrencePatternValue = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
export type SessionStatusValue =
  | "UPCOMING"
  | "LIVE"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED";
export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE";

export interface AdminClassInstructor {
  id: string;
  name: string;
  email: string;
}

export interface AdminClassCohortInstructor extends AdminClassInstructor {
  roles: Array<"LEAD" | "ASSISTANT">;
}

export interface AdminClassCohortOption {
  batchId: string;
  batchCourseId: string;
  code: string;
  name: string;
  courseId: string;
  courseTitle: string;
  instructors: AdminClassCohortInstructor[];
}

export interface AdminClassSessionSummary {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: SessionStatusValue;
  recordingUrl: string | null;
  recordingSizeMb: number | null;
  attendeeCount: number;
  chatMessageCount: number;
}

export interface AdminClassMetrics {
  sessionCount: number;
  recordingCount: number;
  attendeeCount: number;
  attendanceRate: number;
  chatMessageCount: number;
  nextSessionStart: string | null;
  latestSessionStart: string | null;
  latestSessionStatus: SessionStatusValue | null;
}

export interface AdminClassSummary {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  subjectName: string;
  instructor: AdminClassInstructor | null;
  batchId: string | null;
  batchCourseId: string | null;
  batchName: string;
  status: LiveClassStatusValue;
  meetingType: MeetingTypeValue;
  recurrence: RecurrencePatternValue;
  durationMinutes: number;
  meetingLink: string;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  autoAttendanceEnabled: boolean;
  scheduledStart: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: AdminClassMetrics;
}

export interface AdminClassAttendanceRow {
  id: string;
  sessionId: string;
  sessionScheduledStart: string;
  userId: string;
  userName: string | null;
  status: AttendanceStatusValue;
  joinTime: string | null;
  leaveTime: string | null;
  durationMinutes: number | null;
}

export interface AdminClassDetail extends AdminClassSummary {
  sessions: AdminClassSessionSummary[];
  attendance: AdminClassAttendanceRow[];
}

export interface AdminClassListFilters {
  search?: string;
  status?: LiveClassStatusValue;
  courseId?: string;
  instructorId?: string;
  /** Inclusive ISO start of the next/latest session date range. */
  dateFrom?: string;
  /** Exclusive ISO end of the next/latest session date range. */
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminClassListResult {
  classes: AdminClassSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminClassStats {
  total: number;
  live: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface AdminClassOption {
  id: string;
  title: string;
  batchName: string;
  subjectName: string;
}

export interface AdminClassPayload {
  title: string;
  courseId: string;
  subjectName: string;
  instructorId: string;
  batchId: string | null;
  batchCourseId: string | null;
  batchName: string;
  status: LiveClassStatusValue;
  meetingType: MeetingTypeValue;
  recurrence: RecurrencePatternValue;
  durationMinutes: number;
  meetingLink: string;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  autoAttendanceEnabled: boolean;
  scheduledStart: string;
}
