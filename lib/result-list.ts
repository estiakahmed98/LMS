import { parseAssessmentFilters, type AssessmentListFilters } from "@/lib/assessment-list";
import type { LearnerAssessmentResultItem } from "@/lib/learner-assessment-types";

export const RESULT_STATUSES = ["ALL", "COMPLETED", "PASSED", "FAILED", "PENDING"] as const;
export type ResultStatus = typeof RESULT_STATUSES[number];
export type ResultListFilters = Omit<AssessmentListFilters, "status"> & { status: ResultStatus };
export type ResultListRow = LearnerAssessmentResultItem & {
  createdAt: string;
  resultStatus: "PASSED" | "FAILED" | "PENDING";
};
export type ResultListResponse = {
  results: ResultListRow[];
  nextCursor: string | null;
  total: number;
  typeCounts: Record<string, number>;
  statusCounts: Record<string, number>;
};
export function parseResultFilters(params: URLSearchParams): ResultListFilters {
  const status = params.get("status") || "ALL";
  if (!(RESULT_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid result status.");
  const common = new URLSearchParams(params);
  common.set("status", "ALL");
  return { ...parseAssessmentFilters(common), status: status as ResultStatus };
}
