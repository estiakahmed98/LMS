export type AssessmentAssignmentTargetValue = "COURSE" | "BATCH" | "LEARNER";

export function selectEffectiveAssessmentAssignment<
  T extends { targetType: AssessmentAssignmentTargetValue; updatedAt: Date },
>(assignments: T[]): T | null {
  const priority: Record<AssessmentAssignmentTargetValue, number> = {
    LEARNER: 3,
    BATCH: 2,
    COURSE: 1,
  };

  return (
    assignments.slice().sort(
      (left, right) =>
        priority[right.targetType] - priority[left.targetType] ||
        right.updatedAt.getTime() - left.updatedAt.getTime(),
    )[0] ?? null
  );
}
