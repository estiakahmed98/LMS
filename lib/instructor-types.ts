export type SessionStatusValue =
  | "UPCOMING"
  | "LIVE"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED";

export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE";

export interface InstructorLiveClassSummary {
  id: string;
  title: string;
  subjectName: string;
  batchName: string;
  durationMinutes: number;
  meetingLink: string;
  courseTitle: string;
}

export interface InstructorSession {
  id: string;
  liveClassId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  status: SessionStatusValue;
  recordingUrl: string | null;
  attendeeCount: number;
  liveClass: InstructorLiveClassSummary;
}

export interface InstructorAttendanceRow {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  status: AttendanceStatusValue;
  joinTime: string | null;
  leaveTime: string | null;
  durationMinutes: number | null;
  speakTimeSeconds: number | null;
}

export interface InstructorParticipantsPayload {
  sessions: InstructorSession[];
  attendance: InstructorAttendanceRow[];
  selectedSessionId: string | null;
}
