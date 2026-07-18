import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import type {
  AdminBatch,
  AdminExamType,
  AdminInstitution,
  ImportDraftStatusValue,
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
  QuestionImportJobSummary,
  QuestionPaperDetail,
  QuestionPaperPayload,
  QuestionPaperSummary,
} from "@/lib/question-bank-types";
import type {
  DifficultyValue,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";

const questionTypeValues: QuestionTypeValue[] = ["MCQ", "WRITTEN", "PRACTICAL"];
const difficultyValues: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"];
const statusValues: QuestionBankStatusValue[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
];
const institutionTypeValues: InstitutionTypeValue[] = [
  "SCHOOL",
  "COLLEGE",
  "UNIVERSITY",
  "OTHER",
];

// The "Add Question" button seeds every new row with this exact template.
// Hashing it verbatim would make every untouched blank question collide as
// a "duplicate" of the very first one ever created, so we salt the hash
// with a random token until the user actually writes real content.
const BLANK_QUESTION_TEMPLATE = {
  question: "new question",
  options: ["option a", "option b", "option c", "option d"],
};

function isBlankQuestionTemplate(question: string, options: string[]): boolean {
  const normalizedQuestion = question.trim().toLowerCase();
  const normalizedOptions = options.map((o) => o.trim().toLowerCase());
  return (
    normalizedQuestion === BLANK_QUESTION_TEMPLATE.question &&
    normalizedOptions.length === BLANK_QUESTION_TEMPLATE.options.length &&
    normalizedOptions.every((o, i) => o === BLANK_QUESTION_TEMPLATE.options[i])
  );
}

export function computeContentHash(question: string, options: string[]): string {
  if (isBlankQuestionTemplate(question, options)) {
    return createHash("sha256").update(randomUUID()).digest("hex");
  }
  const normalized = [question, ...options]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ============= Institution =============

export async function listInstitutions(): Promise<AdminInstitution[]> {
  const institutions = await prisma.institution.findMany({ orderBy: { name: "asc" } });
  return institutions.map((institution) => ({
    id: institution.id,
    name: institution.name,
    type: institution.type as InstitutionTypeValue,
    createdAt: institution.createdAt.toISOString(),
    updatedAt: institution.updatedAt.toISOString(),
  }));
}

export async function createInstitution(
  input: unknown,
  actorId: string | null = null,
): Promise<AdminInstitution> {
  const payload = (input ?? {}) as { name?: string; type?: string };
  if (!payload.name?.trim()) throw new Error("Institution name is required.");
  const type = String(payload.type ?? "").toUpperCase();
  if (!institutionTypeValues.includes(type as InstitutionTypeValue)) {
    throw new Error("Invalid institution type.");
  }

  const institution = await prisma.institution.create({
    data: { name: payload.name.trim(), type: type as InstitutionTypeValue },
  });

  await auditLogEntry({
    actorId,
    action: "institution.created",
    entity: "Institution",
    entityId: institution.id,
    changes: { name: institution.name, type: institution.type },
  });

  return {
    id: institution.id,
    name: institution.name,
    type: institution.type as InstitutionTypeValue,
    createdAt: institution.createdAt.toISOString(),
    updatedAt: institution.updatedAt.toISOString(),
  };
}

export async function updateInstitution(
  id: string,
  input: unknown,
  actorId: string | null = null,
): Promise<AdminInstitution> {
  const payload = (input ?? {}) as { name?: string; type?: string };
  if (!payload.name?.trim()) throw new Error("Institution name is required.");
  const type = String(payload.type ?? "").toUpperCase();
  if (!institutionTypeValues.includes(type as InstitutionTypeValue)) {
    throw new Error("Invalid institution type.");
  }

  const institution = await prisma.institution.update({
    where: { id },
    data: { name: payload.name.trim(), type: type as InstitutionTypeValue },
  });

  await auditLogEntry({
    actorId,
    action: "institution.updated",
    entity: "Institution",
    entityId: institution.id,
    changes: { name: institution.name, type: institution.type },
  });

  return {
    id: institution.id,
    name: institution.name,
    type: institution.type as InstitutionTypeValue,
    createdAt: institution.createdAt.toISOString(),
    updatedAt: institution.updatedAt.toISOString(),
  };
}

export async function deleteInstitution(id: string, actorId: string | null = null) {
  await prisma.institution.delete({ where: { id } });
  await auditLogEntry({
    actorId,
    action: "institution.deleted",
    entity: "Institution",
    entityId: id,
  });
}

// ============= Batch =============

const batchInclude = { course: { select: { id: true, title: true } } } satisfies Prisma.BatchInclude;

function serializeBatch(
  batch: Prisma.BatchGetPayload<{ include: typeof batchInclude }>,
): AdminBatch {
  return {
    id: batch.id,
    name: batch.name,
    courseId: batch.courseId,
    courseTitle: batch.course?.title ?? null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

export async function listBatches(): Promise<AdminBatch[]> {
  const batches = await prisma.batch.findMany({
    include: batchInclude,
    orderBy: { name: "asc" },
  });
  return batches.map(serializeBatch);
}

export async function createBatch(
  input: unknown,
  actorId: string | null = null,
): Promise<AdminBatch> {
  const payload = (input ?? {}) as { name?: string; courseId?: string | null };
  if (!payload.name?.trim()) throw new Error("Batch name is required.");

  const batch = await prisma.batch.create({
    data: { name: payload.name.trim(), courseId: payload.courseId?.trim() || null },
    include: batchInclude,
  });

  await auditLogEntry({
    actorId,
    action: "batch.created",
    entity: "Batch",
    entityId: batch.id,
    changes: { name: batch.name, courseId: batch.courseId },
  });

  return serializeBatch(batch);
}

export async function updateBatch(
  id: string,
  input: unknown,
  actorId: string | null = null,
): Promise<AdminBatch> {
  const payload = (input ?? {}) as { name?: string; courseId?: string | null };
  if (!payload.name?.trim()) throw new Error("Batch name is required.");

  const batch = await prisma.batch.update({
    where: { id },
    data: { name: payload.name.trim(), courseId: payload.courseId?.trim() || null },
    include: batchInclude,
  });

  await auditLogEntry({
    actorId,
    action: "batch.updated",
    entity: "Batch",
    entityId: batch.id,
    changes: { name: batch.name, courseId: batch.courseId },
  });

  return serializeBatch(batch);
}

export async function deleteBatch(id: string, actorId: string | null = null) {
  await prisma.batch.delete({ where: { id } });
  await auditLogEntry({ actorId, action: "batch.deleted", entity: "Batch", entityId: id });
}

// ============= ExamType =============

export async function listExamTypes(): Promise<AdminExamType[]> {
  const examTypes = await prisma.examType.findMany({ orderBy: { name: "asc" } });
  return examTypes.map((examType) => ({
    id: examType.id,
    name: examType.name,
    slug: examType.slug,
    createdAt: examType.createdAt.toISOString(),
    updatedAt: examType.updatedAt.toISOString(),
  }));
}

export async function createExamType(
  input: unknown,
  actorId: string | null = null,
): Promise<AdminExamType> {
  const payload = (input ?? {}) as { name?: string };
  if (!payload.name?.trim()) throw new Error("Exam type name is required.");

  const examType = await prisma.examType.create({
    data: { name: payload.name.trim(), slug: slugify(payload.name) },
  });

  await auditLogEntry({
    actorId,
    action: "examType.created",
    entity: "ExamType",
    entityId: examType.id,
    changes: { name: examType.name },
  });

  return {
    id: examType.id,
    name: examType.name,
    slug: examType.slug,
    createdAt: examType.createdAt.toISOString(),
    updatedAt: examType.updatedAt.toISOString(),
  };
}

export async function updateExamType(
  id: string,
  input: unknown,
  actorId: string | null = null,
): Promise<AdminExamType> {
  const payload = (input ?? {}) as { name?: string };
  if (!payload.name?.trim()) throw new Error("Exam type name is required.");

  const examType = await prisma.examType.update({
    where: { id },
    data: { name: payload.name.trim(), slug: slugify(payload.name) },
  });

  await auditLogEntry({
    actorId,
    action: "examType.updated",
    entity: "ExamType",
    entityId: examType.id,
    changes: { name: examType.name },
  });

  return {
    id: examType.id,
    name: examType.name,
    slug: examType.slug,
    createdAt: examType.createdAt.toISOString(),
    updatedAt: examType.updatedAt.toISOString(),
  };
}

export async function deleteExamType(id: string, actorId: string | null = null) {
  await prisma.examType.delete({ where: { id } });
  await auditLogEntry({
    actorId,
    action: "examType.deleted",
    entity: "ExamType",
    entityId: id,
  });
}

// ============= QuestionBankItem =============

const questionBankItemInclude = {
  course: { select: { id: true, title: true } },
  module: { select: { id: true, title: true } },
  batch: { select: { id: true, name: true } },
  examType: { select: { id: true, name: true } },
  institution: { select: { id: true, name: true } },
} satisfies Prisma.QuestionBankItemInclude;

const questionPaperInclude = {
  course: { select: { id: true, title: true } },
  module: { select: { id: true, title: true } },
  batch: { select: { id: true, name: true } },
  examType: { select: { id: true, name: true } },
  institution: { select: { id: true, name: true } },
  questions: { select: { id: true, marks: true } },
} satisfies Prisma.QuestionPaperInclude;

type QuestionPaperWithRelations = Prisma.QuestionPaperGetPayload<{
  include: typeof questionPaperInclude;
}>;

function serializeQuestionPaper(
  paper: QuestionPaperWithRelations,
): QuestionPaperSummary {
  return {
    id: paper.id,
    title: paper.title,
    specialInstructions: paper.specialInstructions,
    courseId: paper.courseId,
    courseTitle: paper.course?.title ?? null,
    moduleId: paper.moduleId,
    moduleTitle: paper.module?.title ?? null,
    batchId: paper.batchId,
    batchName: paper.batch?.name ?? null,
    examTypeId: paper.examTypeId,
    examTypeName: paper.examType?.name ?? null,
    institutionId: paper.institutionId,
    institutionName: paper.institution?.name ?? null,
    examYear: paper.examYear,
    questionCount: paper.questions.length,
    totalMarks: paper.questions.reduce((sum, q) => sum + (q.marks ?? 0), 0),
    createdAt: paper.createdAt.toISOString(),
    updatedAt: paper.updatedAt.toISOString(),
  };
}

export function normalizeQuestionPaperPayload(input: unknown): QuestionPaperPayload {
  const payload = (input ?? {}) as Partial<QuestionPaperPayload>;
  if (!payload.title?.trim()) throw new Error("Paper title is required.");

  const examYear =
    payload.examYear === null || payload.examYear === undefined
      ? null
      : Number(payload.examYear);
  if (examYear !== null && (!Number.isInteger(examYear) || examYear < 1900)) {
    throw new Error("Invalid exam year.");
  }

  return {
    title: payload.title.trim(),
    specialInstructions:
      payload.specialInstructions?.toString().trim() || null,
    courseId: payload.courseId?.toString().trim() || null,
    moduleId: payload.moduleId?.toString().trim() || null,
    batchId: payload.batchId?.toString().trim() || null,
    examTypeId: payload.examTypeId?.toString().trim() || null,
    institutionId: payload.institutionId?.toString().trim() || null,
    examYear,
  };
}

export async function listQuestionPapers(): Promise<QuestionPaperSummary[]> {
  const papers = await prisma.questionPaper.findMany({
    include: questionPaperInclude,
    orderBy: { createdAt: "desc" },
  });
  return papers.map(serializeQuestionPaper);
}

export async function getQuestionPaperById(
  id: string,
): Promise<QuestionPaperDetail | null> {
  const paper = await prisma.questionPaper.findUnique({
    where: { id },
    include: questionPaperInclude,
  });
  if (!paper) return null;

  const questions = await prisma.questionBankItem.findMany({
    where: { paperId: id },
    include: questionBankItemInclude,
    orderBy: { order: "asc" },
  });

  return {
    ...serializeQuestionPaper(paper),
    questions: questions.map(serializeQuestionBankItem),
  };
}

export async function createQuestionPaper(
  payload: QuestionPaperPayload,
  actorId: string | null = null,
): Promise<QuestionPaperSummary> {
  const paper = await prisma.questionPaper.create({
    data: { ...payload, createdById: actorId },
    include: questionPaperInclude,
  });

  await auditLogEntry({
    actorId,
    action: "questionPaper.created",
    entity: "QuestionPaper",
    entityId: paper.id,
    changes: { title: paper.title },
  });

  return serializeQuestionPaper(paper);
}

export async function updateQuestionPaper(
  id: string,
  payload: QuestionPaperPayload,
  actorId: string | null = null,
): Promise<QuestionPaperSummary> {
  const paper = await prisma.questionPaper.update({
    where: { id },
    data: payload,
    include: questionPaperInclude,
  });

  await auditLogEntry({
    actorId,
    action: "questionPaper.updated",
    entity: "QuestionPaper",
    entityId: paper.id,
    changes: { title: paper.title },
  });

  return serializeQuestionPaper(paper);
}

export async function deleteQuestionPaper(id: string, actorId: string | null = null) {
  await prisma.questionPaper.delete({ where: { id } });
  await auditLogEntry({
    actorId,
    action: "questionPaper.deleted",
    entity: "QuestionPaper",
    entityId: id,
  });
}

type QuestionBankItemWithRelations = Prisma.QuestionBankItemGetPayload<{
  include: typeof questionBankItemInclude;
}>;

function serializeQuestionBankItem(
  item: QuestionBankItemWithRelations,
): QuestionBankItemSummary {
  return {
    id: item.id,
    type: item.type as QuestionTypeValue,
    question: item.question,
    options: item.options,
    correctAnswer: item.correctAnswer,
    rubric: item.rubric,
    difficulty: item.difficulty as DifficultyValue,
    marks: item.marks,
    examYear: item.examYear,
    status: item.status as QuestionBankStatusValue,
    tags: item.tags,
    usageCount: item.usageCount,
    courseId: item.courseId,
    courseTitle: item.course?.title ?? null,
    moduleId: item.moduleId,
    moduleTitle: item.module?.title ?? null,
    batchId: item.batchId,
    batchName: item.batch?.name ?? null,
    examTypeId: item.examTypeId,
    examTypeName: item.examType?.name ?? null,
    institutionId: item.institutionId,
    institutionName: item.institution?.name ?? null,
    paperId: item.paperId,
    order: item.order,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function normalizeQuestionBankPayload(input: unknown): QuestionBankItemPayload {
  const payload = (input ?? {}) as Partial<QuestionBankItemPayload>;
  const type = String(payload.type ?? "").toUpperCase();
  const difficulty = String(payload.difficulty ?? "MEDIUM").toUpperCase();
  const status = String(payload.status ?? "DRAFT").toUpperCase();

  if (!payload.question?.trim()) throw new Error("Question text is required.");
  if (!questionTypeValues.includes(type as QuestionTypeValue)) {
    throw new Error("Invalid question type.");
  }
  if (!difficultyValues.includes(difficulty as DifficultyValue)) {
    throw new Error("Invalid difficulty.");
  }
  if (!statusValues.includes(status as QuestionBankStatusValue)) {
    throw new Error("Invalid status.");
  }

  const marks =
    payload.marks === null || payload.marks === undefined ? null : Number(payload.marks);
  if (marks !== null && (!Number.isInteger(marks) || marks < 0)) {
    throw new Error("Marks must be a non-negative whole number.");
  }

  const examYear =
    payload.examYear === null || payload.examYear === undefined
      ? null
      : Number(payload.examYear);
  if (examYear !== null && (!Number.isInteger(examYear) || examYear < 1900)) {
    throw new Error("Invalid exam year.");
  }

  return {
    type: type as QuestionTypeValue,
    question: payload.question.trim(),
    options: Array.isArray(payload.options) ? payload.options.map((o) => String(o)) : [],
    correctAnswer: payload.correctAnswer?.toString().trim() || null,
    rubric: payload.rubric?.toString().trim() || null,
    difficulty: difficulty as DifficultyValue,
    marks,
    examYear,
    status: status as QuestionBankStatusValue,
    tags: Array.isArray(payload.tags) ? payload.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    courseId: payload.courseId?.toString().trim() || null,
    moduleId: payload.moduleId?.toString().trim() || null,
    batchId: payload.batchId?.toString().trim() || null,
    examTypeId: payload.examTypeId?.toString().trim() || null,
    institutionId: payload.institutionId?.toString().trim() || null,
    paperId: payload.paperId?.toString().trim() || null,
    order: payload.order !== undefined ? Number(payload.order) : undefined,
  };
}

export async function listQuestionBankItems(
  filters: QuestionBankListFilters,
): Promise<QuestionBankListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;

  const where: Prisma.QuestionBankItemWhereInput = {
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.moduleId ? { moduleId: filters.moduleId } : {}),
    ...(filters.batchId ? { batchId: filters.batchId } : {}),
    ...(filters.examTypeId ? { examTypeId: filters.examTypeId } : {}),
    ...(filters.institutionId ? { institutionId: filters.institutionId } : {}),
    ...(filters.examYear ? { examYear: filters.examYear } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.paperId ? { paperId: filters.paperId } : {}),
    ...(filters.unassignedOnly ? { paperId: null } : {}),
    ...(filters.search?.trim()
      ? {
          OR: [
            { question: { contains: filters.search.trim(), mode: "insensitive" } },
            { tags: { has: filters.search.trim() } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.questionBankItem.findMany({
      where,
      include: questionBankItemInclude,
      orderBy: filters.paperId ? { order: "asc" } : { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.questionBankItem.count({ where }),
  ]);

  return {
    items: items.map(serializeQuestionBankItem),
    total,
    page,
    pageSize,
  };
}

export async function getQuestionBankItemById(
  id: string,
): Promise<QuestionBankItemSummary | null> {
  const item = await prisma.questionBankItem.findUnique({
    where: { id },
    include: questionBankItemInclude,
  });
  return item ? serializeQuestionBankItem(item) : null;
}

export async function createQuestionBankItem(
  payload: QuestionBankItemPayload,
  actorId: string | null = null,
): Promise<QuestionBankItemSummary> {
  const contentHash = computeContentHash(payload.question, payload.options);

  const existing = await prisma.questionBankItem.findUnique({ where: { contentHash } });
  if (existing) {
    throw new Error("A question with identical content already exists in the bank.");
  }

  const item = await prisma.questionBankItem.create({
    data: {
      type: payload.type,
      question: payload.question,
      options: payload.options,
      correctAnswer: payload.correctAnswer,
      rubric: payload.rubric,
      difficulty: payload.difficulty,
      marks: payload.marks,
      examYear: payload.examYear,
      status: payload.status,
      tags: payload.tags,
      courseId: payload.courseId,
      moduleId: payload.moduleId,
      batchId: payload.batchId,
      examTypeId: payload.examTypeId,
      institutionId: payload.institutionId,
      paperId: payload.paperId ?? null,
      order: payload.order ?? 0,
      contentHash,
      createdById: actorId,
    },
    include: questionBankItemInclude,
  });

  await auditLogEntry({
    actorId,
    action: "questionBankItem.created",
    entity: "QuestionBankItem",
    entityId: item.id,
    changes: { type: item.type, courseId: item.courseId },
  });

  return serializeQuestionBankItem(item);
}

export async function updateQuestionBankItem(
  id: string,
  payload: QuestionBankItemPayload,
  actorId: string | null = null,
): Promise<QuestionBankItemSummary> {
  const contentHash = computeContentHash(payload.question, payload.options);

  const duplicate = await prisma.questionBankItem.findFirst({
    where: { contentHash, NOT: { id } },
  });
  if (duplicate) {
    throw new Error("A question with identical content already exists in the bank.");
  }

  const item = await prisma.questionBankItem.update({
    where: { id },
    data: {
      type: payload.type,
      question: payload.question,
      options: payload.options,
      correctAnswer: payload.correctAnswer,
      rubric: payload.rubric,
      difficulty: payload.difficulty,
      marks: payload.marks,
      examYear: payload.examYear,
      status: payload.status,
      tags: payload.tags,
      courseId: payload.courseId,
      moduleId: payload.moduleId,
      batchId: payload.batchId,
      examTypeId: payload.examTypeId,
      institutionId: payload.institutionId,
      ...(payload.paperId !== undefined ? { paperId: payload.paperId } : {}),
      ...(payload.order !== undefined ? { order: payload.order } : {}),
      contentHash,
    },
    include: questionBankItemInclude,
  });

  await auditLogEntry({
    actorId,
    action: "questionBankItem.updated",
    entity: "QuestionBankItem",
    entityId: item.id,
    changes: { type: item.type, status: item.status },
  });

  return serializeQuestionBankItem(item);
}

export async function deleteQuestionBankItem(id: string, actorId: string | null = null) {
  await prisma.questionBankItem.delete({ where: { id } });
  await auditLogEntry({
    actorId,
    action: "questionBankItem.deleted",
    entity: "QuestionBankItem",
    entityId: id,
  });
}

// ============= Import Jobs & Drafts =============

function serializeImportJob(
  job: Prisma.QuestionImportJobGetPayload<Record<string, never>>,
): QuestionImportJobSummary {
  return {
    id: job.id,
    fileName: job.fileName,
    fileUrl: job.fileUrl,
    status: job.status as QuestionImportJobDetail["status"],
    totalPages: job.totalPages,
    extractedCount: job.extractedCount,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function serializeImportDraft(
  draft: Prisma.QuestionImportDraftGetPayload<Record<string, never>>,
): QuestionImportDraftItem {
  return {
    id: draft.id,
    importJobId: draft.importJobId,
    pageNumber: draft.pageNumber,
    type: draft.type as QuestionTypeValue,
    question: draft.question,
    options: draft.options,
    correctAnswer: draft.correctAnswer,
    rubric: draft.rubric,
    difficulty: draft.difficulty as DifficultyValue,
    marks: draft.marks,
    confidenceScore: draft.confidenceScore,
    status: draft.status as ImportDraftStatusValue,
    reviewedQuestionBankItemId: draft.reviewedQuestionBankItemId,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

export async function createImportJob(
  fileName: string,
  fileUrl: string | null,
  actorId: string | null = null,
): Promise<QuestionImportJobSummary> {
  const job = await prisma.questionImportJob.create({
    data: { fileName, fileUrl, status: "PROCESSING", createdById: actorId },
  });

  await auditLogEntry({
    actorId,
    action: "questionImportJob.created",
    entity: "QuestionImportJob",
    entityId: job.id,
    changes: { fileName },
  });

  return serializeImportJob(job);
}

export async function getImportJobById(id: string): Promise<QuestionImportJobDetail | null> {
  const job = await prisma.questionImportJob.findUnique({
    where: { id },
    include: { drafts: { orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }] } },
  });
  if (!job) return null;
  return {
    ...serializeImportJob(job),
    drafts: job.drafts.map(serializeImportDraft),
  };
}

export async function listImportJobs(): Promise<QuestionImportJobSummary[]> {
  const jobs = await prisma.questionImportJob.findMany({ orderBy: { createdAt: "desc" } });
  return jobs.map(serializeImportJob);
}

export interface CreateImportDraftPayload {
  type: QuestionTypeValue;
  question: string;
  options: string[];
  correctAnswer: string | null;
  rubric: string | null;
  difficulty: DifficultyValue;
  marks: number | null;
  confidenceScore: number | null;
}

export async function createImportDraft(
  importJobId: string,
  pageNumber: number | null,
  payload: CreateImportDraftPayload,
): Promise<QuestionImportDraftItem> {
  const draft = await prisma.questionImportDraft.create({
    data: { importJobId, pageNumber, ...payload, status: "NEEDS_REVIEW" },
  });
  await auditLogEntry({
    actorId: null,
    action: "questionImportDraft.created",
    entity: "QuestionImportDraft",
    entityId: draft.id,
    changes: { importJobId, pageNumber },
  });
  return serializeImportDraft(draft);
}

export async function updateImportDraft(
  draftId: string,
  payload: QuestionImportDraftUpdatePayload,
  actorId: string | null = null,
): Promise<QuestionImportDraftItem> {
  const draft = await prisma.questionImportDraft.update({
    where: { id: draftId },
    data: {
      ...(payload.type ? { type: payload.type } : {}),
      ...(payload.question !== undefined ? { question: payload.question } : {}),
      ...(payload.options !== undefined ? { options: payload.options } : {}),
      ...(payload.correctAnswer !== undefined ? { correctAnswer: payload.correctAnswer } : {}),
      ...(payload.rubric !== undefined ? { rubric: payload.rubric } : {}),
      ...(payload.difficulty ? { difficulty: payload.difficulty } : {}),
      ...(payload.marks !== undefined ? { marks: payload.marks } : {}),
    },
  });
  await auditLogEntry({
    actorId,
    action: "questionImportDraft.updated",
    entity: "QuestionImportDraft",
    entityId: draft.id,
    changes: payload,
  });
  return serializeImportDraft(draft);
}

export async function rejectImportDraft(
  draftId: string,
  actorId: string | null = null,
): Promise<QuestionImportDraftItem> {
  const draft = await prisma.questionImportDraft.update({
    where: { id: draftId },
    data: { status: "REJECTED" },
  });
  await auditLogEntry({
    actorId,
    action: "questionImportDraft.rejected",
    entity: "QuestionImportDraft",
    entityId: draft.id,
  });
  return serializeImportDraft(draft);
}

export async function confirmImportDraft(
  draftId: string,
  payload: QuestionImportDraftConfirmPayload,
  actorId: string | null = null,
): Promise<{ draft: QuestionImportDraftItem; questionBankItem: QuestionBankItemSummary }> {
  const draft = await prisma.questionImportDraft.findUniqueOrThrow({ where: { id: draftId } });

  const contentHash = computeContentHash(draft.question, draft.options);
  const duplicate = await prisma.questionBankItem.findUnique({ where: { contentHash } });
  if (duplicate) {
    throw new Error("A question with identical content already exists in the bank.");
  }

  const [updatedDraft, questionBankItem] = await prisma.$transaction(async (tx) => {
    const nextOrder = payload.paperId
      ? ((await tx.questionBankItem.aggregate({
          where: { paperId: payload.paperId },
          _max: { order: true },
        }))._max.order ?? -1) + 1
      : 0;

    const item = await tx.questionBankItem.create({
      data: {
        type: draft.type,
        question: draft.question,
        options: draft.options,
        correctAnswer: draft.correctAnswer,
        rubric: draft.rubric,
        difficulty: draft.difficulty,
        marks: draft.marks,
        examYear: payload.examYear,
        status: payload.status,
        tags: payload.tags,
        courseId: payload.courseId,
        moduleId: payload.moduleId,
        batchId: payload.batchId,
        examTypeId: payload.examTypeId,
        institutionId: payload.institutionId,
        paperId: payload.paperId ?? null,
        order: nextOrder,
        contentHash,
        createdById: actorId,
      },
      include: questionBankItemInclude,
    });

    const updated = await tx.questionImportDraft.update({
      where: { id: draftId },
      data: { status: "CONFIRMED", reviewedQuestionBankItemId: item.id },
    });

    return [updated, item] as const;
  });

  await auditLogEntry({
    actorId,
    action: "questionImportDraft.confirmed",
    entity: "QuestionBankItem",
    entityId: questionBankItem.id,
    changes: { importJobId: draft.importJobId, draftId },
  });

  return {
    draft: serializeImportDraft(updatedDraft),
    questionBankItem: serializeQuestionBankItem(questionBankItem),
  };
}

export async function markImportJobStatus(
  jobId: string,
  status: QuestionImportJobDetail["status"],
  extra?: { totalPages?: number; extractedCount?: number; errorMessage?: string },
) {
  const job = await prisma.questionImportJob.update({
    where: { id: jobId },
    data: {
      status,
      ...(extra?.totalPages !== undefined ? { totalPages: extra.totalPages } : {}),
      ...(extra?.extractedCount !== undefined ? { extractedCount: extra.extractedCount } : {}),
      ...(extra?.errorMessage !== undefined ? { errorMessage: extra.errorMessage } : {}),
    },
  });
  await auditLogEntry({
    actorId: null,
    action: "questionImportJob.statusUpdated",
    entity: "QuestionImportJob",
    entityId: job.id,
    changes: { status, ...extra },
  });
}
