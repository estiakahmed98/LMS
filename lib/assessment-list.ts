export const ASSESSMENT_TYPES = ["MCQ", "WRITTEN", "PRACTICAL", "MIXED"] as const;
export const ASSESSMENT_STATUSES = ["ALL", "AVAILABLE", "UPCOMING", "PENDING", "COMPLETED", "CLOSED"] as const;
export type AssessmentListStatus = typeof ASSESSMENT_STATUSES[number];
export type AssessmentListFilters = {
  type: typeof ASSESSMENT_TYPES[number]; status: AssessmentListStatus;
  courseId: string; batchId: string; scope: string; from: string; to: string;
  pageSize: number; cursor: string;
};
export function parseAssessmentFilters(params: URLSearchParams): AssessmentListFilters {
  const type = params.get("type") || "MCQ";
  const status = params.get("status") || "ALL";
  const scope = params.get("scope") || "";
  const pageSize = Number(params.get("pageSize") || 12);
  if (!(ASSESSMENT_TYPES as readonly string[]).includes(type) || !(ASSESSMENT_STATUSES as readonly string[]).includes(status) || !["", "COURSE", "BATCH", "LEARNER"].includes(scope) || ![12, 24, 48].includes(pageSize)) throw new Error("Invalid assessment filters.");
  const from = params.get("from") || "", to = params.get("to") || "";
  for (const date of [from, to]) {
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error("Invalid date.");
  }
  if (from && to && from > to) throw new Error("Start date must be before end date.");
  const courseId = params.get("courseId") || "", batchId = params.get("batchId") || "", cursor = params.get("cursor") || "";
  if ([courseId, batchId, cursor].some(value => value.length > 200)) throw new Error("Invalid filter value.");
  if (cursor) decodeAssessmentCursor(cursor);
  return { type: type as AssessmentListFilters["type"], status: status as AssessmentListStatus, scope, pageSize, from, to, courseId, batchId, cursor };
}
export function decodeAssessmentCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const value = JSON.parse(atob(cursor));
    if (typeof value.id !== "string" || !value.id || value.id.length > 100 || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt))) throw new Error();
    return value;
  } catch { throw new Error("Invalid page cursor."); }
}
export type AssessmentListRow = {
  id: string; title: string; type: AssessmentListFilters["type"]; totalMarks: number; passingMarks: number;
  courseTitle: string; courseId: string; createdAt: string; availableFrom: string | null; dueAt: string | null;
  targetType: string | null; batchName: string | null; attemptLimit: number | null;
  attemptsUsed: number; obtainedMarks: number | null; submissionId: string | null; listStatus: AssessmentListStatus;
};
export type AssessmentListResponse = {
  assessments: AssessmentListRow[]; nextCursor: string | null; total: number;
  typeCounts: Record<string, number>; statusCounts: Record<string, number>;
};
