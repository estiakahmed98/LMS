import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EnrollmentStatus } from "@/lib/generated/prisma/enums";
import {
  isActiveAccountStatus,
  isApprovedEnrollment,
  isLearnerRole,
} from "@/lib/portal-access";

export class LearnerAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "LearnerAuthError";
    this.status = status;
  }
}

export interface AuthorizedLearner {
  id: string;
  name: string;
  email: string;
  role: "STUDENT";
}

/**
 * Authenticates a learner via the real NextAuth session and re-reads role/status
 * from the database. Never falls back to mock/path identities.
 */
export async function requireLearner(
  _pathname = "/courses",
): Promise<AuthorizedLearner> {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) {
    throw new LearnerAuthError("You must be signed in.", 401);
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  if (!currentUser) {
    throw new LearnerAuthError("You must be signed in.", 401);
  }

  if (!isActiveAccountStatus(currentUser.status)) {
    throw new LearnerAuthError("This account is not active.", 403);
  }

  if (!isLearnerRole(currentUser.role)) {
    throw new LearnerAuthError("Learner access required.", 403);
  }

  return {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: "STUDENT",
  };
}

/** @deprecated Use requireLearner — kept as an alias for assessment routes. */
export async function requireLearnerAccount(): Promise<AuthorizedLearner> {
  return requireLearner("/assessments");
}

export async function requireApprovedEnrollment(
  userId: string,
  courseId: string,
): Promise<{ courseId: string; status: EnrollmentStatus }> {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: { courseId: true, status: true },
  });

  if (!enrollment) {
    throw new LearnerAuthError("You are not enrolled in this course.", 404);
  }

  if (!isApprovedEnrollment(enrollment.status)) {
    throw new LearnerAuthError("Your enrollment is not approved yet.", 403);
  }

  return enrollment;
}
