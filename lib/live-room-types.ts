import type { Role } from "@/lib/generated/prisma/enums";

export type LiveRoomRole = "HOST" | "CO_HOST" | "PARTICIPANT";

export type LiveRecordingStatus =
  | "IDLE"
  | "STARTING"
  | "ACTIVE"
  | "ENDING"
  | "COMPLETE"
  | "FAILED";

/**
 * cloud — LiveKit egress records server-side (needs LIVEKIT_S3_* storage).
 * local — the host's browser records the room and uploads it to this app.
 */
export type LiveRecordingMode = "cloud" | "local";

export interface LiveRoomSessionSummary {
  id: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED" | "MISSED" | "CANCELLED";
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  recordingUrl: string | null;
  recordingStatus: LiveRecordingStatus;
  recordingMode: LiveRecordingMode;
  isRecording: boolean;
}

export interface LiveRoomClassSummary {
  id: string;
  title: string;
  subjectName: string;
  batchName: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  waitingRoomEnabled: boolean;
  recordingEnabled: boolean;
  autoAttendanceEnabled: boolean;
}

export interface LiveRoomCurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LiveRoomParticipant {
  id: string;
  name: string;
  role: LiveRoomRole;
  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  isSelf?: boolean;
}

export interface LiveRoomWaitingUser {
  id: string;
  name: string;
}

export interface LiveRoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  isPrivate: boolean;
  toUserId: string | null;
  toName: string | null;
  sentAt: string;
}

export interface LiveRoomPayload {
  session: LiveRoomSessionSummary;
  liveClass: LiveRoomClassSummary;
  currentUser: LiveRoomCurrentUser;
  isHost: boolean;
  /** COURSES edit — host recording/end/admit and session start mutations. */
  canMutate: boolean;
  isWaiting: boolean;
  isRejected: boolean;
  /** Student was removed by host while session is still open. */
  isRemoved: boolean;
  /** Session is COMPLETED / CANCELLED — reopen blocked. */
  isSessionClosed: boolean;
  participants: LiveRoomParticipant[];
  waitingUsers: LiveRoomWaitingUser[];
  messages: LiveRoomMessage[];
}
