import type {
  AssessmentAssignmentData,
  AssessmentAssignmentStatusValue,
  CreateAssessmentAssignmentInput,
} from "@/lib/assessment-assignment-types";
import { parseApiJson } from "@/lib/parse-api-json";

async function request(
  assessmentId: string,
  init?: RequestInit,
  query = "",
) {
  const response = await fetch(
    `/api/admin/assessments/${assessmentId}/assignments${query}`,
    { cache: "no-store", ...init },
  );
  const data = await parseApiJson<AssessmentAssignmentData & { error?: string }>(response);
  if (!response.ok) throw new Error(data.error ?? "Assignment operation failed.");
  return data;
}

export function fetchAssessmentAssignments(assessmentId: string) {
  return request(assessmentId);
}

export function saveAssessmentAssignment(
  assessmentId: string,
  input: CreateAssessmentAssignmentInput,
) {
  return request(assessmentId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createAssignment", ...input }),
  });
}

export function createAssessmentCohort(
  assessmentId: string,
  input: { name: string; startDate?: string | null; endDate?: string | null },
) {
  return request(assessmentId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "createBatch", ...input }),
  });
}

export function syncAssessmentCohortMembers(
  assessmentId: string,
  batchId: string,
  userIds: string[],
) {
  return request(assessmentId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "syncBatchMembers", batchId, userIds }),
  });
}

export function setAssessmentAssignmentStatus(
  assessmentId: string,
  assignmentId: string,
  status: AssessmentAssignmentStatusValue,
) {
  return request(assessmentId, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateStatus", assignmentId, status }),
  });
}

export function removeAssessmentAssignment(
  assessmentId: string,
  assignmentId: string,
) {
  return request(
    assessmentId,
    { method: "DELETE" },
    `?assignmentId=${encodeURIComponent(assignmentId)}`,
  );
}
