export type AssessmentAssignmentTargetValue = "COURSE" | "BATCH" | "LEARNER";

export function selectEffectiveAssessmentAssignment<
  T extends { id?: string; targetType: AssessmentAssignmentTargetValue; updatedAt: Date },
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
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        (left.id && right.id ? (right.id > left.id ? 1 : right.id < left.id ? -1 : 0) : 0),
    )[0] ?? null
  );
}
