import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  InstitutionTypeValue,
  QuestionBankItemPayload,
  QuestionBankItemSummary,
  QuestionBankListFilters,
  QuestionBankListResult,
  QuestionBankStatusValue,
  QuestionImportDraftConfirmPayload,
  QuestionImportDraftItem,
  QuestionImportDraftUpdatePayload,
  QuestionImportJobDetail,
  QuestionPaperDetail,
  QuestionPaperPayload,
  QuestionPaperSummary,
} from "@/lib/question-bank-types";

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as { error?: string } | T | null;
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data ? data.error : null;
    throw new Error(message || "Request failed.");
  }
  return data as T;
}

async function mutate<T>(url: string, method: string, payload?: unknown): Promise<T> {
  return readJson<T>(await fetch(url, {
    method,
    ...(payload === undefined ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  }));
}

export async function fetchInstitutions() {
  return (await readJson<{ institutions: AdminInstitution[] }>(await fetch("/api/admin/question-bank/institutions", { cache: "no-store" }))).institutions;
}
export async function createInstitution(payload: { name: string; type: InstitutionTypeValue }) {
  return (await mutate<{ institution: AdminInstitution }>("/api/admin/question-bank/institutions", "POST", payload)).institution;
}
export async function updateInstitution(id: string, payload: { name: string; type: InstitutionTypeValue }) {
  return (await mutate<{ institution: AdminInstitution }>(`/api/admin/question-bank/institutions/${id}`, "PATCH", payload)).institution;
}
export async function deleteInstitution(id: string) { await mutate(`/api/admin/question-bank/institutions/${id}`, "DELETE"); }

export async function fetchBatches() {
  return (await readJson<{ batches: AdminBatch[] }>(await fetch("/api/admin/question-bank/batches", { cache: "no-store" }))).batches;
}
export async function createBatch(payload: { name: string; courseId: string | null }) {
  return (await mutate<{ batch: AdminBatch }>("/api/admin/question-bank/batches", "POST", payload)).batch;
}
export async function updateBatch(id: string, payload: { name: string; courseId: string | null }) {
  return (await mutate<{ batch: AdminBatch }>(`/api/admin/question-bank/batches/${id}`, "PATCH", payload)).batch;
}
export async function deleteBatch(id: string) { await mutate(`/api/admin/question-bank/batches/${id}`, "DELETE"); }

export async function fetchExamTypes() {
  return (await readJson<{ examTypes: AdminExamType[] }>(await fetch("/api/admin/question-bank/exam-types", { cache: "no-store" }))).examTypes;
}
export async function createExamType(payload: { name: string }) {
  return (await mutate<{ examType: AdminExamType }>("/api/admin/question-bank/exam-types", "POST", payload)).examType;
}
export async function updateExamType(id: string, payload: { name: string }) {
  return (await mutate<{ examType: AdminExamType }>(`/api/admin/question-bank/exam-types/${id}`, "PATCH", payload)).examType;
}
export async function deleteExamType(id: string) { await mutate(`/api/admin/question-bank/exam-types/${id}`, "DELETE"); }

export async function fetchQuestionPapers() {
  return (await readJson<{ papers: QuestionPaperSummary[] }>(await fetch("/api/admin/question-bank/papers", { cache: "no-store" }))).papers;
}
export async function fetchQuestionPaper(id: string) {
  return (await readJson<{ paper: QuestionPaperDetail }>(await fetch(`/api/admin/question-bank/papers/${id}`, { cache: "no-store" }))).paper;
}
export async function createQuestionPaper(payload: QuestionPaperPayload) {
  return (await mutate<{ paper: QuestionPaperSummary }>("/api/admin/question-bank/papers", "POST", payload)).paper;
}
export async function updateQuestionPaper(id: string, payload: QuestionPaperPayload) {
  return (await mutate<{ paper: QuestionPaperSummary }>(`/api/admin/question-bank/papers/${id}`, "PATCH", payload)).paper;
}
export async function deleteQuestionPaper(id: string) { await mutate(`/api/admin/question-bank/papers/${id}`, "DELETE"); }

export async function fetchQuestionBankItems(filters: QuestionBankListFilters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.size ? `?${params}` : "";
  return readJson<QuestionBankListResult>(await fetch(`/api/admin/question-bank${query}`, { cache: "no-store" }));
}
export async function fetchQuestionBankItem(id: string) {
  return (await readJson<{ item: QuestionBankItemSummary }>(await fetch(`/api/admin/question-bank/${id}`, { cache: "no-store" }))).item;
}
export async function createQuestionBankItem(payload: QuestionBankItemPayload) {
  return (await mutate<{ item: QuestionBankItemSummary }>("/api/admin/question-bank", "POST", payload)).item;
}
export async function updateQuestionBankItem(id: string, payload: QuestionBankItemPayload) {
  return (await mutate<{ item: QuestionBankItemSummary }>(`/api/admin/question-bank/${id}`, "PATCH", payload)).item;
}
export async function deleteQuestionBankItem(id: string) { await mutate(`/api/admin/question-bank/${id}`, "DELETE"); }
export async function bulkUpdateQuestionBankStatus(ids: string[], status: QuestionBankStatusValue) {
  return mutate<{ count: number }>("/api/admin/question-bank/bulk-status", "PATCH", { ids, status });
}

export async function uploadQuestionBankPdf(file: File) {
  const form = new FormData();
  form.append("file", file);
  return readJson<{ jobId: string }>(await fetch("/api/admin/question-bank/import", { method: "POST", body: form }));
}
export async function fetchImportJob(jobId: string) {
  return (await readJson<{ job: QuestionImportJobDetail }>(await fetch(`/api/admin/question-bank/import/${jobId}`, { cache: "no-store" }))).job;
}
export async function updateImportDraft(jobId: string, draftId: string, payload: QuestionImportDraftUpdatePayload) {
  return (await mutate<{ draft: QuestionImportDraftItem }>(`/api/admin/question-bank/import/${jobId}/drafts/${draftId}`, "PATCH", { action: "update", payload })).draft;
}
export async function confirmImportDraft(jobId: string, draftId: string, payload: QuestionImportDraftConfirmPayload) {
  return mutate<{ draft: QuestionImportDraftItem; questionBankItem: QuestionBankItemSummary }>(`/api/admin/question-bank/import/${jobId}/drafts/${draftId}`, "PATCH", { action: "confirm", payload });
}
export async function rejectImportDraft(jobId: string, draftId: string) {
  return (await mutate<{ draft: QuestionImportDraftItem }>(`/api/admin/question-bank/import/${jobId}/drafts/${draftId}`, "PATCH", { action: "reject" })).draft;
}
