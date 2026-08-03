export type AdminReportType =
  | "overview"
  | "course"
  | "assessment"
  | "mcq"
  | "student"
  | "certificate"
  | "audit";

export type AdminReportAssessmentType = "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED";

export interface AdminReportCourseOption {
  id: string;
  title: string;
}

export interface AdminReportStats {
  totalStudents: number;
  totalAssessments: number;
  totalSubmissions: number;
  totalCertificates: number;
}

export interface AdminCourseReportRow {
  courseId: string;
  course: string;
  students: number;
  assessments: number;
  completed: number;
  avgProgress: number;
  passRate: number;
}

export interface AdminAssessmentReportRow {
  id: string;
  assessment: string;
  courseId: string;
  course: string;
  type: AdminReportAssessmentType;
  totalMarks: number;
  passingMarks: number;
  submissions: number;
  pending: number;
  avgScore: number;
  passRate: number;
}

export interface AdminMcqResultRow {
  id: string;
  assessmentId: string;
  assessment: string;
  courseId: string;
  course: string;
  student: string;
  email: string;
  obtainedMarks: number | null;
  totalMarks: number;
  passingMarks: number;
  scorePercent: number | null;
  passed: boolean | null;
  answered: number;
  correct: number;
  questionCount: number;
  status: string;
  submittedAt: string | null;
}

export interface AdminMcqAnswerSheetQuestion {
  id: string;
  question: string;
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  marks: number;
  awardedMarks: number;
}

export interface AdminMcqAnswerSheet {
  id: string;
  assessmentId: string;
  assessment: string;
  course: string;
  student: string;
  email: string;
  obtainedMarks: number | null;
  totalMarks: number;
  passingMarks: number;
  scorePercent: number | null;
  passed: boolean | null;
  answered: number;
  correct: number;
  questionCount: number;
  status: string;
  submittedAt: string | null;
  questions: AdminMcqAnswerSheetQuestion[];
}

export interface AdminStudentReportRow {
  student: string;
  courseId: string;
  course: string;
  progress: number;
  submissions: number;
  status: string;
  certificateEligible: boolean;
}

export interface AdminCertificateReportRow {
  id: string;
  certificateNumber: string;
  student: string;
  courseId: string;
  course: string;
  issueDate: string;
}

export interface AdminAuditReportRow {
  id: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  date: string;
}

export interface AdminReportsPayload {
  generatedAt: string;
  courses: AdminReportCourseOption[];
  stats: AdminReportStats;
  rows: {
    courses: AdminCourseReportRow[];
    assessments: AdminAssessmentReportRow[];
    mcqResults: AdminMcqResultRow[];
    students: AdminStudentReportRow[];
    certificates: AdminCertificateReportRow[];
    audit: AdminAuditReportRow[];
  };
}
