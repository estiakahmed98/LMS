import { Prisma } from "@/lib/generated/prisma/client";
import {
  AssessmentAssignmentStatus,
  AssessmentAssignmentTarget,
} from "@/lib/generated/prisma/enums";
import { selectEffectiveAssessmentAssignment } from "@/lib/assessment-access-policy";
import { prisma } from "@/lib/prisma";

export { selectEffectiveAssessmentAssignment } from "@/lib/assessment-access-policy";

export function learnerActiveAssignmentWhere(
  learnerId: string,
  now = new Date(),
): Prisma.AssessmentAssignmentWhereInput {
  return {
    status: AssessmentAssignmentStatus.PUBLISHED,
    AND: [
      {
        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
      },
      {
        OR: [
          { targetType: AssessmentAssignmentTarget.COURSE },
          {
            targetType: AssessmentAssignmentTarget.BATCH,
            batch: {
              status: "ACTIVE",
              AND: [
                { OR: [{ startDate: null }, { startDate: { lte: now } }] },
                { OR: [{ endDate: null }, { endDate: { gt: now } }] },
              ],
              memberships: { some: { userId: learnerId } },
            },
          },
          {
            targetType: AssessmentAssignmentTarget.LEARNER,
            learnerId,
          },
        ],
      },
    ],
  };
}

export async function resolveLearnerAssessmentAssignment(
  learnerId: string,
  assessmentId: string,
  now = new Date(),
) {
  const assignments = await prisma.assessmentAssignment.findMany({
    where: {
      assessmentId,
      ...learnerActiveAssignmentWhere(learnerId, now),
    },
  });

  return selectEffectiveAssessmentAssignment(assignments);
}
