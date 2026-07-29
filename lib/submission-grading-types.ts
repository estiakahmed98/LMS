export type ManualReviewStatusValue =
  | "NOT_REQUIRED"
  | "PENDING_MAKER"
  | "MAKER_DRAFT"
  | "PENDING_CHECKER"
  | "RETURNED_TO_MAKER"
  | "FINALIZED";

export type GradingQueueFilter =
  | "maker"
  | "checker"
  | "returned"
  | "finalized"
  | "all";

export interface SubmissionGradeLinePayload {
  questionId: string;
  marks: number | null;
  comment?: string | null;
}

export interface MakerReviewPayload {
  action: "save-draft" | "submit-for-checker";
  grades: SubmissionGradeLinePayload[];
  overallMarks?: number | null;
  comment?: string | null;
}

export interface CheckerReviewPayload {
  action: "return-to-maker" | "approve";
  grades: SubmissionGradeLinePayload[];
  overallMarks?: number | null;
  comment?: string | null;
}

export interface GradingQueueItem {
  id: string;
  learnerId: string;
  learnerName: string;
  courseId: string;
  courseTitle: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED";
  submissionStatus: string;
  manualReviewStatus: ManualReviewStatusValue;
  submittedAt: string | null;
  updatedAt: string;
  makerId: string | null;
  makerName: string | null;
  checkerId: string | null;
  checkerName: string | null;
  obtainedMarks: number | null;
  totalMarks: number;
  pendingChecker: boolean;
}

export interface GradingSubmissionQuestion {
  questionId: string;
  prompt: string;
  type: "MCQ" | "WRITTEN" | "PRACTICAL";
  maxMarks: number;
  options: string[];
  learnerAnswer: string | null;
  makerMarks: number | null;
  makerComment: string | null;
  checkerMarks: number | null;
  checkerComment: string | null;
}

export interface GradingSubmissionDetail extends GradingQueueItem {
  answerPayload: {
    kind: "MCQ" | "WRITTEN" | "PRACTICAL";
    answers?: Record<string, string>;
    attachments?: string[];
    notes?: string;
  } | null;
  makerComment: string | null;
  checkerComment: string | null;
  returnReason: string | null;
  makerTotalMarks: number | null;
  checkerTotalMarks: number | null;
  makerMarkedAt: string | null;
  makerSubmittedAt: string | null;
  checkedAt: string | null;
  questions: GradingSubmissionQuestion[];
}
