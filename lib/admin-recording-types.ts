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

export interface AdminRecordingListFilters {
  search?: string;
  batchName?: string;
  subjectName?: string;
  /** Inclusive ISO start of the scheduledStart range. */
  dateFrom?: string;
  /** Exclusive ISO end of the scheduledStart range. */
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminRecordingListResult {
  recordings: AdminRecordingSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminRecordingFacets {
  batchNames: string[];
  subjectNames: string[];
}
