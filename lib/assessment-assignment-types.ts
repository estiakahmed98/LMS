export type AssessmentAssignmentTargetValue = "COURSE" | "BATCH" | "LEARNER";
export type AssessmentAssignmentStatusValue = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface AssessmentAssignmentItem {
  id: string;
  targetType: AssessmentAssignmentTargetValue;
  targetLabel: string;
  targetKey: string;
  batchId: string | null;
  learnerId: string | null;
  status: AssessmentAssignmentStatusValue;
  availableFrom: string | null;
  dueAt: string | null;
  attemptLimit: number;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentBatchOption {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  startDate: string | null;
  endDate: string | null;
  memberIds: string[];
}

export interface AssessmentLearnerOption {
  id: string;
  name: string;
  email: string;
}

export interface AssessmentAssignmentData {
  assessment: { id: string; title: string; courseId: string; courseTitle: string };
  assignments: AssessmentAssignmentItem[];
  batches: AssessmentBatchOption[];
  learners: AssessmentLearnerOption[];
}

export interface CreateAssessmentAssignmentInput {
  targetType: AssessmentAssignmentTargetValue;
  batchId?: string;
  learnerIds?: string[];
  status: AssessmentAssignmentStatusValue;
  availableFrom?: string | null;
  dueAt?: string | null;
  attemptLimit: number;
}
