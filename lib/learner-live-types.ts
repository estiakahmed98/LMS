export type SessionStatusValue =
  | "UPCOMING"
  | "LIVE"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED";

export type AttendanceStatusValue = "PRESENT" | "ABSENT" | "LATE";

export interface LearnerLiveCourse {
  id: string;
  title: string;
  description: string;
  liveClassCount: number;
}

export interface LearnerLiveSession {
  id: string;
  liveClassId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: SessionStatusValue;
  recordingUrl: string | null;
  attendeeCount: number;
  liveClass: {
    id: string;
    title: string;
    subjectName: string;
    batchName: string;
    durationMinutes: number;
    courseId: string;
    courseTitle: string;
    instructorId: string;
    instructorName: string;
  };
  myAttendance: {
    status: AttendanceStatusValue;
    durationMinutes: number | null;
  } | null;
}

export interface LearnerLiveClassesPayload {
  courses: LearnerLiveCourse[];
  sessions: LearnerLiveSession[];
}
