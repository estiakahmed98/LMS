export type AssessmentTypeValue = "MCQ" | "WRITTEN" | "PRACTICAL";
export type QuestionTypeValue = "MCQ" | "WRITTEN" | "PRACTICAL";
export type DifficultyValue = "EASY" | "MEDIUM" | "HARD";

/**
 * Derived from the assessment's PUBLISHED assignments' availableFrom/dueAt
 * windows (an assessment has no schedule of its own) — see listAssessments.
 */
export type AssessmentLifecycleStatus =
  | "DRAFT"
  | "UPCOMING"
  | "RUNNING"
  | "COMPLETED";

export interface AdminAssessmentQuestion {
  id: string;
  type: QuestionTypeValue;
  question: string;
  marks: number;
  options: string[];
  correctAnswer: string | null;
  correctAnswers: string[];
  rubric: string | null;
  difficulty: DifficultyValue;
  timeLimitMinutes: number | null;
}

export interface AdminAssessmentSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  type: AssessmentTypeValue;
  totalMarks: number;
  passingMarks: number;
  instructions: string;
  questionCount: number;
  assignmentCount: number;
  publishedAssignmentCount: number;
  lifecycleStatus: AssessmentLifecycleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAssessmentDetail extends AdminAssessmentSummary {
  questions: AdminAssessmentQuestion[];
}

export interface AdminAssessmentListFilters {
  search?: string;
  courseId?: string;
  type?: AssessmentTypeValue;
  status?: AssessmentLifecycleStatus;
  /** Inclusive ISO start of the createdAt range (Year filter). */
  dateFrom?: string;
  /** Exclusive ISO end of the createdAt range (Year filter). */
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAssessmentListResult {
  assessments: AdminAssessmentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminAssessmentStats {
  all: number;
  draft: number;
  upcoming: number;
  running: number;
  completed: number;
}

export interface AdminAssessmentPayload {
  courseId: string;
  title: string;
  type: AssessmentTypeValue;
  totalMarks: number;
  passingMarks: number;
  instructions?: string;
}

export interface AdminQuestionPayload {
  type: QuestionTypeValue;
  question: string;
  marks: number;
  options: string[];
  correctAnswer: string | null;
  correctAnswers?: string[];
  rubric: string | null;
  difficulty: DifficultyValue;
  timeLimitMinutes: number | null;
}

export interface AdminExtractedCqPart {
  label: string;
  text: string;
  marks: number;
}

export interface AdminExtractedQuestion {
  type: QuestionTypeValue;
  question: string;
  marks: number;
  options: string[];

  // Backward compatibility
  correctAnswer: string | null;

  // Multiple correct answers
  correctAnswers: string[];

  rubric: string | null;
  difficulty: DifficultyValue;
  timeLimitMinutes: number | null;

  cqParts?: AdminExtractedCqPart[];
}
