export type SessionStatusValue =
  | "UPCOMING"
  | "LIVE"
  | "COMPLETED"
  | "MISSED"
  | "CANCELLED";

export interface AdminRecordingInstructor {
  id: string;
  name: string;
  email: string;
}

export interface AdminRecordingSummary {
  id: string;
  liveClassId: string;
  classTitle: string;
  courseId: string;
  courseTitle: string;
  subjectName: string;
  batchName: string;
  instructor: AdminRecordingInstructor | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: SessionStatusValue;
  recordingUrl: string;
  recordingSizeMb: number | null;
  /** Raw YouTube URL pasted by the admin (e.g. an Unlisted video link). */
  youtubeUrl: string | null;
  /** YouTube video ID extracted from youtubeUrl. */
  youtubeVideoId: string | null;
  attendeeCount: number;
  createdAt: string;
}

export interface AdminRecordingPayload {
  liveClassId: string;
  scheduledStart: string;
  scheduledEnd: string;
  recordingUrl: string;
  recordingSizeMb: number | null;
  /** Raw YouTube URL pasted by the admin (e.g. an Unlisted video link). */
  youtubeUrl: string | null;
  /** YouTube video ID extracted from youtubeUrl. */
  youtubeVideoId: string | null;
}
