export type AdminReportType =
  | "overview"
  | "course"
  | "assessment"
  | "marksheet"
  | "mcq"
  | "question"
  | "batch"
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
  passRate: number;
  failRate: number;
  completionRate: number;
  averageScore: number;
  atRiskStudents: number;
  gradingBacklog: number;
  attendanceRate: number;
}

export interface AdminQuestionAnalyticsRow {
  questionId: string;
  questionNumber: number;
  question: string;
  assessmentId: string;
  assessment: string;
  courseId: string;
  course: string;
  difficulty: string;
  attempts: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracyRate: number;
  errorRate: number;
}

export interface AdminBatchReportRow {
  id: string;
  batch: string;
  courseId: string;
  course: string;
  instructors: string[];
  classes: number;
  completedClasses: number;
  attendanceRecords: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
  averageDurationMinutes: number;
}

export interface AdminReportTrendPoint {
  month: string;
  submissions: number;
  passRate: number;
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

export interface AdminMarksheetRow {
  studentId: string;
  courseId: string;
  student: string;
  email: string;
  course: string;
  assessmentCount: number;
  submittedCount: number;
  gradedCount: number;
  obtainedMarks: number;
  totalMarks: number;
  scorePercent: number | null;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  courseProgress: number;
  status: string;
}

export interface AdminMarksheetAssessmentResult {
  assessmentId: string;
  title: string;
  type: AdminReportAssessmentType;
  totalMarks: number;
  passingMarks: number;
  obtainedMarks: number | null;
  scorePercent: number | null;
  passed: boolean | null;
  status: string;
  submittedAt: string | null;
}

export interface AdminConsolidatedMarksheet {
  studentId: string;
  courseId: string;
  student: string;
  email: string;
  course: string;
  courseProgress: number;
  generatedAt: string;
  summary: {
    assessmentCount: number;
    submittedCount: number;
    gradedCount: number;
    obtainedMarks: number;
    totalMarks: number;
    scorePercent: number | null;
    passedCount: number;
    failedCount: number;
    pendingCount: number;
    result: string;
  };
  assessments: AdminMarksheetAssessmentResult[];
}

export interface AdminStudentReportRow {
  studentId: string;
  student: string;
  email: string;
  courseId: string;
  course: string;
  progress: number;
  submissions: number;
  status: string;
  certificateEligible: boolean;
  scorePercent: number | null;
  passed: number;
  failed: number;
  pending: number;
  risk: "On Track" | "Watch" | "At Risk";
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
  trends: AdminReportTrendPoint[];
  rows: {
    courses: AdminCourseReportRow[];
    assessments: AdminAssessmentReportRow[];
    marksheets: AdminMarksheetRow[];
    mcqResults: AdminMcqResultRow[];
    questionAnalytics: AdminQuestionAnalyticsRow[];
    batches: AdminBatchReportRow[];
    students: AdminStudentReportRow[];
    certificates: AdminCertificateReportRow[];
    audit: AdminAuditReportRow[];
  };
}
