import type {
  AdminAssessmentReportRow,
  AdminCertificateReportRow,
  AdminCourseReportRow,
  AdminMarksheetRow,
  AdminMcqResultRow,
  AdminReportCourseOption,
  AdminReportStats,
  AdminReportType,
  AdminStudentReportRow,
} from "@/lib/admin-report-types";

export type InstructorReportRow =
  | AdminCourseReportRow
  | AdminAssessmentReportRow
  | AdminMarksheetRow
  | AdminStudentReportRow
  | AdminMcqResultRow
  | AdminCertificateReportRow;

export interface InstructorReportsQuery {
  report: AdminReportType;
  courseId?: string;
  assessmentType?: string;
  page?: number;
  pageSize?: number;
}

export interface InstructorReportsPayload {
  generatedAt: string;
  range: { years: number; from: string };
  courses: AdminReportCourseOption[];
  stats: AdminReportStats;
  rows: InstructorReportRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
