import type {
  AdminAssessmentDetail,
  AdminAssessmentPayload,
  AdminAssessmentSummary,
  AdminExtractedQuestion,
  AdminQuestionPayload,
  AssessmentTypeValue,
} from "@/lib/admin-assessment-types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data ? data.error : null;
    throw new Error(message || "Request failed.");
  }

  return data as T;
}

export async function fetchAssessments(courseId?: string, type?: AssessmentTypeValue) {
  const params = new URLSearchParams();
  if (courseId) params.set("courseId", courseId);
  if (type) params.set("type", type);
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await readJson<{ assessments: AdminAssessmentSummary[] }>(
    await fetch(`/api/admin/assessments${query}`, { cache: "no-store" }),
  );
  return data.assessments;
}

export async function fetchAssessment(assessmentId: string) {
  const data = await readJson<{ assessment: AdminAssessmentDetail }>(
    await fetch(`/api/admin/assessments/${assessmentId}`, { cache: "no-store" }),
  );
  return data.assessment;
}

export async function createAssessment(payload: AdminAssessmentPayload) {
  const data = await readJson<{ assessment: AdminAssessmentDetail }>(
    await fetch("/api/admin/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.assessment;
}

export async function updateAssessment(assessmentId: string, payload: AdminAssessmentPayload) {
  const data = await readJson<{ assessment: AdminAssessmentDetail }>(
    await fetch(`/api/admin/assessments/${assessmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.assessment;
}

export async function deleteAssessment(assessmentId: string) {
  await readJson<{ ok: boolean }>(
    await fetch(`/api/admin/assessments/${assessmentId}`, { method: "DELETE" }),
  );
}

export async function createQuestion(assessmentId: string, payload: AdminQuestionPayload) {
  const data = await readJson<{ assessment: AdminAssessmentDetail }>(
    await fetch(`/api/admin/assessments/${assessmentId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.assessment;
}

export async function updateQuestion(
  assessmentId: string,
  questionId: string,
  payload: AdminQuestionPayload,
) {
  const data = await readJson<{ assessment: AdminAssessmentDetail }>(
    await fetch(`/api/admin/assessments/${assessmentId}/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.assessment;
}

export async function deleteQuestion(assessmentId: string, questionId: string) {
  const data = await readJson<{ assessment: AdminAssessmentDetail }>(
    await fetch(`/api/admin/assessments/${assessmentId}/questions/${questionId}`, {
      method: "DELETE",
    }),
  );
  return data.assessment;
}

export async function extractQuestionsFromFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const data = await readJson<{ questions: AdminExtractedQuestion[] }>(
    await fetch("/api/admin/assessments/extract", {
      method: "POST",
      body: formData,
    }),
  );
  return data.questions;
}
