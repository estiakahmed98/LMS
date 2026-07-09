export type AssessmentTypeValue = "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED";
export type QuestionTypeValue = "MCQ" | "WRITTEN" | "PRACTICAL";
export type DifficultyValue = "EASY" | "MEDIUM" | "HARD";

export interface AdminAssessmentQuestion {
  id: string;
  type: QuestionTypeValue;
  question: string;
  marks: number;
  options: string[];
  correctAnswer: string | null;
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
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAssessmentDetail extends AdminAssessmentSummary {
  questions: AdminAssessmentQuestion[];
}

export interface AdminAssessmentPayload {
  courseId: string;
  title: string;
  type: AssessmentTypeValue;
  totalMarks: number;
  passingMarks: number;
}

export interface AdminQuestionPayload {
  type: QuestionTypeValue;
  question: string;
  marks: number;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
  timeLimitMinutes: number | null;
}

export interface AdminExtractedQuestion {
  type: QuestionTypeValue;
  question: string;
  marks: number;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
}
