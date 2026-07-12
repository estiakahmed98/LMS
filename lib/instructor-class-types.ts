import type {
  MeetingTypeValue,
  RecurrencePatternValue,
} from "@/lib/admin-class-types";

export interface InstructorCourseOption {
  id: string;
  title: string;
}

export interface InstructorCreateClassPayload {
  title: string;
  courseId: string;
  subjectName: string;
  batchName: string;
  meetingType: MeetingTypeValue;
  recurrence: RecurrencePatternValue;
  durationMinutes: number;
  meetingLink: string;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  autoAttendanceEnabled: boolean;
  scheduledStart: string;
}
