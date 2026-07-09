export type LearnerAssessmentType = "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED";

export type LearnerAssessmentQuestion = {
  id: string;
  question: string;
  type: "MCQ" | "WRITTEN" | "PRACTICAL";
  marks: number;
  options: string[];
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

export type LearnerAssessmentSubmissionReviewItem = {
  questionId: string;
  question: string;
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  marks: number;
};

export type LearnerAssessmentSubmissionPayload = {
  kind: "MCQ" | "WRITTEN" | "PRACTICAL";
  answers?: Record<string, string>;
  attachments?: string[];
  notes?: string;
};

export type LearnerAssessmentSubmission = {
  id: string;
  status: LearnerAssessmentSubmissionStatus;
  obtainedMarks: number | null;
  submittedAt: string | null;
  scorePercent: number | null;
  passed: boolean | null;
  payload: LearnerAssessmentSubmissionPayload | null;
  review: LearnerAssessmentSubmissionReviewItem[];
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
};

export type LearnerAssessmentDetail = {
  assessment: {
    id: string;
    title: string;
    type: LearnerAssessmentType;
    totalMarks: number;
    passingMarks: number;
    course: LearnerAssessmentCourse;
  };
  questions: LearnerAssessmentQuestion[];
  submission: LearnerAssessmentSubmission | null;
};

export type LearnerAssessmentListPayload = {
  assessments: LearnerAssessmentListItem[];
};
