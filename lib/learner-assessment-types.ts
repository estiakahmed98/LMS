export type LearnerAssessmentType = "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED";

export type LearnerAssessmentQuestion = {
  id: string;
  question: string;
  type: "MCQ" | "WRITTEN" | "PRACTICAL";
  marks: number;
  options: string[];
  timeLimitMinutes: number | null;
  allowsMultipleAnswers: boolean;
};

export type LearnerAssessmentCourse = {
  id: string;
  title: string;
};

export type LearnerAssessmentSubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "GRADING"
  | "GRADED"
  | "REVIEWED";

export type LearnerAssessmentManualReviewStatus =
  | "NOT_REQUIRED"
  | "PENDING_MAKER"
  | "MAKER_DRAFT"
  | "PENDING_CHECKER"
  | "RETURNED_TO_MAKER"
  | "FINALIZED";

export type LearnerAssessmentSubmissionReviewItem = {
  questionId: string;
  question: string;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  marks: number;
  makerMarks?: number | null;
  checkerMarks?: number | null;
  finalMarks?: number | null;
  makerComment?: string | null;
  checkerComment?: string | null;
};

export type LearnerAssessmentSubmissionFeedback = {
  makerComment: string | null;
  checkerComment: string | null;
  returnReason: string | null;
  makerMarkedAt: string | null;
  makerSubmittedAt: string | null;
  checkedAt: string | null;
};

export type LearnerAssessmentSubmissionPayload = {
  kind: "MCQ" | "WRITTEN" | "PRACTICAL";
  answers?: Record<string, string | string[]>;
  attachments?: string[];
  notes?: string;
};

export type LearnerAssessmentSubmission = {
  id: string;
  attemptNumber: number;
  status: LearnerAssessmentSubmissionStatus;
  manualReviewStatus: LearnerAssessmentManualReviewStatus;
  obtainedMarks: number | null;
  submittedAt: string | null;
  scorePercent: number | null;
  passed: boolean | null;
  payload: LearnerAssessmentSubmissionPayload | null;
  feedback: LearnerAssessmentSubmissionFeedback | null;
  review: LearnerAssessmentSubmissionReviewItem[];
};

export type LearnerAssessmentAccess = {
  targetType: "COURSE" | "BATCH" | "LEARNER";
  availableFrom: string | null;
  dueAt: string | null;
  attemptLimit: number;
  attemptsUsed: number;
  canAttempt: boolean;
};

export type LearnerAssessmentListItem = {
  id: string;
  title: string;
  type: LearnerAssessmentType;
  totalMarks: number;
  passingMarks: number;
  questionCount: number;
  course: LearnerAssessmentCourse;
  submission: LearnerAssessmentSubmission | null;
  access: LearnerAssessmentAccess | null;
};

export type LearnerAssessmentDetail = {
  assessment: {
    id: string;
    title: string;
    type: LearnerAssessmentType;
    totalMarks: number;
    passingMarks: number;
    instructions: string;
    course: LearnerAssessmentCourse;
  };
  questions: LearnerAssessmentQuestion[];
  submission: LearnerAssessmentSubmission | null;
  access: LearnerAssessmentAccess | null;
};

export type LearnerAssessmentListPayload = {
  assessments: LearnerAssessmentListItem[];
};

export type LearnerAssessmentResultItem = {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: LearnerAssessmentType;
  course: LearnerAssessmentCourse;
  status: LearnerAssessmentSubmissionStatus;
  manualReviewStatus: LearnerAssessmentManualReviewStatus;
  obtainedMarks: number | null;
  totalMarks: number;
  passingMarks: number;
  scorePercent: number | null;
  submittedAt: string | null;
  attemptNumber: number;
};

export type LearnerAssessmentResultsPayload = {
  results: LearnerAssessmentResultItem[];
};
