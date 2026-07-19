import type { EnrollmentStatus, UserStatus } from "@/lib/generated/prisma/enums";

export function isInstructorRole(role: string): boolean {
  return role === "INSTRUCTOR";
}

export function isLearnerRole(role: string): boolean {
  return role === "STUDENT";
}

export function isActiveAccountStatus(status: UserStatus | string): boolean {
  return status !== "SUSPENDED" && status !== "INACTIVE";
}

export function isApprovedEnrollment(
  status: EnrollmentStatus | string | null | undefined,
): boolean {
  return status === "APPROVED";
}

/** Instructors may only use courses they already teach via a LiveClass. */
export function canInstructorUseCourse(
  assignedCourseIds: Iterable<string>,
  courseId: string,
): boolean {
  const assigned = assignedCourseIds instanceof Set
    ? assignedCourseIds
    : new Set(assignedCourseIds);
  return assigned.has(courseId);
}

export function isOwnedBy(
  ownerId: string | null | undefined,
  actorId: string,
): boolean {
  return ownerId === actorId;
}

export interface PrivateMessageLike {
  isPrivate: boolean;
  senderId: string;
  toUserId?: string | null;
}

/** Private messages are visible to sender, recipient, or host only. */
export function canViewPrivateMessage(
  message: PrivateMessageLike,
  viewerId: string,
  isHost: boolean,
): boolean {
  if (!message.isPrivate) return true;
  if (isHost) return true;
  if (message.senderId === viewerId) return true;
  return message.toUserId === viewerId;
}

export function filterVisibleMessages<T extends PrivateMessageLike>(
  messages: T[],
  viewerId: string,
  isHost: boolean,
): T[] {
  return messages.filter((message) =>
    canViewPrivateMessage(message, viewerId, isHost),
  );
}

const LEARNER_PORTAL_PREFIXES = [
  "/dashboard",
  "/courses",
  "/assessments",
  "/certificates",
  "/settings",
  "/live-classes",
  "/question-bank",
] as const;

export function isLearnerPortalPath(pathname: string): boolean {
  return LEARNER_PORTAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
