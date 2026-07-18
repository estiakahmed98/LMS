import type { QuestionTypeValue, DifficultyValue } from "@/lib/admin-assessment-types";

export type QuestionBankStatusValue = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED";
export type InstitutionTypeValue = "SCHOOL" | "COLLEGE" | "UNIVERSITY" | "OTHER";
export type ImportJobStatusValue =
  | "PROCESSING"
  | "NEEDS_REVIEW"
  | "COMPLETED"
  | "FAILED";
export type ImportDraftStatusValue =
  | "PENDING"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "REJECTED";

export interface AdminInstitution {
  id: string;
  name: string;
  type: InstitutionTypeValue;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBatch {
  id: string;
  name: string;
  courseId: string | null;
  courseTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminExamType {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionPaperSummary {
  id: string;
  title: string;
  specialInstructions: string | null;
  fullMarksOverride: number | null;
  questionsToAnswer: number | null;
  courseId: string | null;
  courseTitle: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  batchId: string | null;
  batchName: string | null;
  examTypeId: string | null;
  examTypeName: string | null;
  institutionId: string | null;
  institutionName: string | null;
  examYear: number | null;
  questionTypes: QuestionTypeValue[];
  questionCount: number;
  totalMarks: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionPaperDetail extends QuestionPaperSummary {
  questions: QuestionBankItemSummary[];
}

export interface QuestionPaperPayload {
  title: string;
  specialInstructions?: string | null;
  fullMarksOverride?: number | null;
  questionsToAnswer?: number | null;
  courseId: string | null;
  moduleId: string | null;
  batchId: string | null;
  examTypeId: string | null;
  institutionId: string | null;
  examYear: number | null;
}

export interface QuestionBankItemSummary {
  id: string;
  type: QuestionTypeValue;
  question: string;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
  marks: number | null;
  examYear: number | null;
  status: QuestionBankStatusValue;
  tags: string[];
  usageCount: number;
  courseId: string | null;
  courseTitle: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  batchId: string | null;
  batchName: string | null;
  examTypeId: string | null;
  examTypeName: string | null;
  institutionId: string | null;
  institutionName: string | null;
  paperId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankItemPayload {
  type: QuestionTypeValue;
  question: string;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
  marks: number | null;
  examYear: number | null;
  status: QuestionBankStatusValue;
  tags: string[];
  courseId: string | null;
  moduleId: string | null;
  batchId: string | null;
  examTypeId: string | null;
  institutionId: string | null;
  paperId?: string | null;
  order?: number;
}

export interface QuestionBankListFilters {
  search?: string;
  courseId?: string;
  moduleId?: string;
  batchId?: string;
  examTypeId?: string;
  institutionId?: string;
  examYear?: number;
  type?: QuestionTypeValue;
  difficulty?: DifficultyValue;
  status?: QuestionBankStatusValue;
  paperId?: string;
  unassignedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface QuestionBankListResult {
  items: QuestionBankItemSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QuestionImportJobSummary {
  id: string;
  fileName: string;
  fileUrl: string | null;
  status: ImportJobStatusValue;
  totalPages: number | null;
  extractedCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionImportDraftItem {
  id: string;
  importJobId: string;
  pageNumber: number | null;
  type: QuestionTypeValue;
  question: string;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
  marks: number | null;
  confidenceScore: number | null;
  status: ImportDraftStatusValue;
  reviewedQuestionBankItemId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionImportJobDetail extends QuestionImportJobSummary {
  drafts: QuestionImportDraftItem[];
}

export interface QuestionImportDraftUpdatePayload {
  type?: QuestionTypeValue;
  question?: string;
  options?: string[];
  correctAnswer?: string | null;
  rubric?: string | null;
  difficulty?: DifficultyValue;
  marks?: number | null;
}

export interface QuestionImportDraftConfirmPayload {
  courseId: string | null;
  moduleId: string | null;
  batchId: string | null;
  examTypeId: string | null;
  institutionId: string | null;
  examYear: number | null;
  status: QuestionBankStatusValue;
  tags: string[];
  paperId?: string | null;
}
