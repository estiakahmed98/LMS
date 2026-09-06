import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import type {
  AdminAssessmentDetail,
  AdminAssessmentListFilters,
  AdminAssessmentListResult,
  AdminAssessmentPayload,
  AdminAssessmentStats,
  AdminAssessmentSummary,
  AdminQuestionPayload,
  AssessmentLifecycleStatus,
  AssessmentTypeValue,
  DifficultyValue,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";
import { Prisma } from "@/lib/generated/prisma/client";

const assessmentTypeValues: AssessmentTypeValue[] = ["MCQ", "WRITTEN", "PRACTICAL"];
const questionTypeValues: QuestionTypeValue[] = ["MCQ", "WRITTEN", "PRACTICAL"];
const difficultyValues: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"];

export class AssessmentDeletionBlockedError extends Error {
  constructor(public readonly attemptCount: number) {
    super(
      attemptCount === 1
        ? "This assessment cannot be deleted because a learner has attempted the exam."
        : `This assessment cannot be deleted because ${attemptCount} exam attempts have been recorded.`,
    );
    this.name = "AssessmentDeletionBlockedError";
  }
}

const assessmentInclude = {
  course: { select: { id: true, title: true } },
  questions: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
  assignments: { select: { status: true, availableFrom: true, dueAt: true } },
} satisfies Prisma.AssessmentInclude;

/**
 * A published assignment is "running" once it has started (availableFrom in
 * the past or unset) and hasn't closed yet (dueAt in the future or unset).
 */
function isRunningAssignmentWindow(
  assignment: { availableFrom: Date | null; dueAt: Date | null },
  now: Date,
) {
  const started = !assignment.availableFrom || assignment.availableFrom <= now;
  const notClosed = !assignment.dueAt || assignment.dueAt >= now;
  return started && notClosed;
}

function isUpcomingAssignmentWindow(
  assignment: { availableFrom: Date | null; dueAt: Date | null },
  now: Date,
) {
  return Boolean(assignment.availableFrom && assignment.availableFrom > now);
}

/**
 * An assessment's lifecycle status is derived from its PUBLISHED assignments
 * (an assessment carries no schedule of its own): RUNNING if any published
 * assignment window is currently open, else UPCOMING if any hasn't started
 * yet, else COMPLETED if every published window has closed, else DRAFT when
 * nothing has ever been published.
 */
function deriveLifecycleStatus(
  assignments: Array<{ status: string; availableFrom: Date | null; dueAt: Date | null }>,
  now: Date,
): AssessmentLifecycleStatus {
  const published = assignments.filter((assignment) => assignment.status === "PUBLISHED");
  if (published.length === 0) return "DRAFT";
  if (published.some((assignment) => isRunningAssignmentWindow(assignment, now))) {
    return "RUNNING";
  }
  if (published.some((assignment) => isUpcomingAssignmentWindow(assignment, now))) {
    return "UPCOMING";
  }
  return "COMPLETED";
}

function serializeAssessment(
  assessment: Prisma.AssessmentGetPayload<{ include: typeof assessmentInclude }>,
): AdminAssessmentSummary {
  return {
    id: assessment.id,
    courseId: assessment.courseId,
    courseTitle: assessment.course.title,
    title: assessment.title,
    // The DB enum still contains legacy MIXED; the app no longer creates it.
    type: assessment.type as AssessmentTypeValue,
    totalMarks: assessment.totalMarks,
    passingMarks: assessment.passingMarks,
    questionCount: assessment.questions.length,
    assignmentCount: assessment.assignments.length,
    publishedAssignmentCount: assessment.assignments.filter(
      (assignment) => assignment.status === "PUBLISHED",
    ).length,
    lifecycleStatus: deriveLifecycleStatus(assessment.assignments, new Date()),
    createdAt: assessment.createdAt.toISOString(),
    updatedAt: assessment.updatedAt.toISOString(),
  };
}

function serializeAssessmentDetail(
  assessment: Prisma.AssessmentGetPayload<{ include: typeof assessmentInclude }>,
): AdminAssessmentDetail {
  return {
    ...serializeAssessment(assessment),
    questions: assessment.questions.map((question) => ({
      id: question.id,
      type: question.type,
      question: question.question,
      marks: question.marks,
      options: question.options,
      correctAnswer: question.correctAnswer,
      rubric: question.rubric,
      difficulty: question.difficulty,
      timeLimitMinutes: question.timeLimitMinutes,
    })),
  };
}

export function normalizeAssessmentPayload(input: unknown): AdminAssessmentPayload {
  const payload = (input ?? {}) as Partial<AdminAssessmentPayload>;
  const type = String(payload.type ?? "").toUpperCase();

  if (!payload.courseId?.trim()) throw new Error("Course is required.");
  if (!payload.title?.trim()) throw new Error("Title is required.");
  if (!assessmentTypeValues.includes(type as AssessmentTypeValue)) {
    throw new Error("Invalid assessment type.");
  }
  const totalMarks = Number(payload.totalMarks);
  const passingMarks = Number(payload.passingMarks);
  if (!Number.isFinite(totalMarks) || totalMarks < 0) {
    throw new Error("Total marks must be a non-negative number.");
  }
  if (!Number.isFinite(passingMarks) || passingMarks < 0) {
    throw new Error("Passing marks must be a non-negative number.");
  }

  return {
    courseId: payload.courseId.trim(),
    title: payload.title.trim(),
    type: type as AssessmentTypeValue,
    totalMarks,
    passingMarks,
  };
}

export function normalizeQuestionPayload(input: unknown): AdminQuestionPayload {
  const payload = (input ?? {}) as Partial<AdminQuestionPayload>;
  const type = String(payload.type ?? "").toUpperCase();
  const difficulty = String(payload.difficulty ?? "MEDIUM").toUpperCase();

  if (!payload.question?.trim()) throw new Error("Question text is required.");
  if (!questionTypeValues.includes(type as QuestionTypeValue)) {
    throw new Error("Invalid question type.");
  }
  if (!difficultyValues.includes(difficulty as DifficultyValue)) {
    throw new Error("Invalid difficulty.");
  }
  const marks = Number(payload.marks);
  if (!Number.isFinite(marks) || marks < 0) {
    throw new Error("Marks must be a non-negative number.");
  }

  return {
    type: type as QuestionTypeValue,
    question: payload.question.trim(),
    marks,
    options: Array.isArray(payload.options) ? payload.options.map((o) => String(o)) : [],
    correctAnswer: payload.correctAnswer?.toString().trim() || null,
    rubric: payload.rubric?.toString().trim() || null,
    difficulty: difficulty as DifficultyValue,
    timeLimitMinutes:
      payload.timeLimitMinutes === null || payload.timeLimitMinutes === undefined
        ? null
        : Number(payload.timeLimitMinutes),
  };
}

/**
 * Mirrors deriveLifecycleStatus as a Prisma where-clause so status can be
 * filtered and counted in SQL instead of loading every assessment into
 * memory — required to stay fast once assessments run into the tens of
 * thousands (multi-year, multi-cohort deployments).
 */
function lifecycleStatusWhere(
  status: AssessmentLifecycleStatus,
  now: Date,
): Prisma.AssessmentWhereInput {
  const runningWindow: Prisma.AssessmentAssignmentWhereInput = {
    status: "PUBLISHED",
    OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
    AND: [{ OR: [{ dueAt: null }, { dueAt: { gte: now } }] }],
  };
  const upcomingWindow: Prisma.AssessmentAssignmentWhereInput = {
    status: "PUBLISHED",
    availableFrom: { gt: now },
  };
  const anyPublished: Prisma.AssessmentAssignmentWhereInput = { status: "PUBLISHED" };

  switch (status) {
    case "DRAFT":
      return { assignments: { none: anyPublished } };
    case "RUNNING":
      return { assignments: { some: runningWindow } };
    case "UPCOMING":
      return {
        assignments: { some: upcomingWindow },
        NOT: { assignments: { some: runningWindow } },
      };
    case "COMPLETED":
      return {
        assignments: { some: anyPublished },
        NOT: {
          OR: [{ assignments: { some: runningWindow } }, { assignments: { some: upcomingWindow } }],
        },
      };
  }
}

export async function listAssessments(
  filters: AdminAssessmentListFilters = {},
): Promise<AdminAssessmentListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 20;
  const now = new Date();

  const andConditions: Prisma.AssessmentWhereInput[] = [];

  if (filters.search?.trim()) {
    andConditions.push({ title: { contains: filters.search.trim(), mode: "insensitive" } });
  }
  if (filters.dateFrom || filters.dateTo) {
    andConditions.push({
      createdAt: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lt: new Date(filters.dateTo) } : {}),
      },
    });
  }
  if (filters.status) {
    andConditions.push(lifecycleStatusWhere(filters.status, now));
  }

  const where: Prisma.AssessmentWhereInput = {
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({
      where,
      include: assessmentInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.assessment.count({ where }),
  ]);

  return {
    assessments: assessments.map((assessment) => serializeAssessment(assessment)),
    total,
    page,
    pageSize,
  };
}

export async function getAssessmentStats(
  filters: Pick<AdminAssessmentListFilters, "search" | "courseId" | "type" | "dateFrom" | "dateTo"> = {},
): Promise<AdminAssessmentStats> {
  const now = new Date();
  const andConditions: Prisma.AssessmentWhereInput[] = [];

  if (filters.search?.trim()) {
    andConditions.push({ title: { contains: filters.search.trim(), mode: "insensitive" } });
  }
  if (filters.dateFrom || filters.dateTo) {
    andConditions.push({
      createdAt: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lt: new Date(filters.dateTo) } : {}),
      },
    });
  }

  const baseWhere: Prisma.AssessmentWhereInput = {
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const withStatus = (status: AssessmentLifecycleStatus): Prisma.AssessmentWhereInput => ({
    ...baseWhere,
    AND: [...(baseWhere.AND ? [baseWhere.AND].flat() : []), lifecycleStatusWhere(status, now)],
  });

  const [all, draft, upcoming, running, completed] = await Promise.all([
    prisma.assessment.count({ where: baseWhere }),
    prisma.assessment.count({ where: withStatus("DRAFT") }),
    prisma.assessment.count({ where: withStatus("UPCOMING") }),
    prisma.assessment.count({ where: withStatus("RUNNING") }),
    prisma.assessment.count({ where: withStatus("COMPLETED") }),
  ]);

  return { all, draft, upcoming, running, completed };
}

export async function getAssessmentById(id: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: assessmentInclude,
  });

  return assessment ? serializeAssessmentDetail(assessment) : null;
}

export async function createAssessment(
  payload: AdminAssessmentPayload,
  actorId: string | null = null,
) {
  const assessment = await prisma.assessment.create({
    data: {
      courseId: payload.courseId,
      title: payload.title,
      type: payload.type,
      totalMarks: payload.totalMarks,
      passingMarks: payload.passingMarks,
    },
    include: assessmentInclude,
  });

  await auditLogEntry({
    actorId,
    action: "assessment.created",
    entity: "Assessment",
    entityId: assessment.id,
    changes: { title: payload.title, courseId: payload.courseId, type: payload.type },
  });

  return serializeAssessmentDetail(assessment);
}

export async function updateAssessment(
  id: string,
  payload: AdminAssessmentPayload,
  actorId: string | null = null,
) {
  const assessment = await prisma.assessment.update({
    where: { id },
    data: {
      courseId: payload.courseId,
      title: payload.title,
      type: payload.type,
      totalMarks: payload.totalMarks,
      passingMarks: payload.passingMarks,
    },
    include: assessmentInclude,
  });

  await auditLogEntry({
    actorId,
    action: "assessment.updated",
    entity: "Assessment",
    entityId: assessment.id,
    changes: { title: payload.title, type: payload.type },
  });

  return serializeAssessmentDetail(assessment);
}

export async function deleteAssessment(id: string, actorId: string | null = null) {
  const deleted = await prisma.$transaction(async (tx) => {
    // Lock the assessment while checking attempts. Submission creation needs a
    // foreign-key lock on the same row, so an attempt cannot race this delete.
    await tx.$queryRaw`SELECT id FROM assessments WHERE id = ${id} FOR UPDATE`;
    const assessment = await tx.assessment.findUnique({
      where: { id },
      select: { title: true, _count: { select: { submissions: true } } },
    });
    if (!assessment) {
      throw new Prisma.PrismaClientKnownRequestError("Assessment not found.", {
        code: "P2025",
        clientVersion: Prisma.prismaVersion.client,
      });
    }
    if (assessment._count.submissions > 0) {
      throw new AssessmentDeletionBlockedError(assessment._count.submissions);
    }
    await tx.assessment.delete({ where: { id } });
    return assessment;
  });

  await auditLogEntry({
    actorId,
    action: "assessment.deleted",
    entity: "Assessment",
    entityId: id,
    changes: { title: deleted.title, attemptCount: 0 },
  });
}

export async function createQuestion(
  assessmentId: string,
  payload: AdminQuestionPayload,
  actorId: string | null = null,
) {
  // New questions are inserted at the top of the builder, so shift every
  // existing question down before giving the new one order 0.
  const question = await prisma.$transaction(async (tx) => {
    await tx.question.updateMany({
      where: { assessmentId },
      data: { order: { increment: 1 } },
    });
    return tx.question.create({
      data: {
        assessmentId,
        type: payload.type,
        question: payload.question,
        marks: payload.marks,
        options: payload.options,
        correctAnswer: payload.correctAnswer,
        rubric: payload.rubric,
        difficulty: payload.difficulty,
        timeLimitMinutes: payload.timeLimitMinutes,
        order: 0,
      },
    });
  });

  await auditLogEntry({
    actorId,
    action: "question.created",
    entity: "Question",
    entityId: question.id,
    changes: { assessmentId },
  });

  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: assessmentInclude,
  });
  return serializeAssessmentDetail(assessment);
}

export async function updateQuestion(
  assessmentId: string,
  questionId: string,
  payload: AdminQuestionPayload,
  actorId: string | null = null,
) {
  await prisma.question.update({
    where: { id: questionId, assessmentId },
    data: {
      type: payload.type,
      question: payload.question,
      marks: payload.marks,
      options: payload.options,
      correctAnswer: payload.correctAnswer,
      rubric: payload.rubric,
      difficulty: payload.difficulty,
      timeLimitMinutes: payload.timeLimitMinutes,
    },
  });

  await auditLogEntry({
    actorId,
    action: "question.updated",
    entity: "Question",
    entityId: questionId,
    changes: { assessmentId },
  });

  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: assessmentInclude,
  });
  return serializeAssessmentDetail(assessment);
}

export async function deleteQuestion(
  assessmentId: string,
  questionId: string,
  actorId: string | null = null,
) {
  await prisma.question.delete({ where: { id: questionId, assessmentId } });

  await auditLogEntry({
    actorId,
    action: "question.deleted",
    entity: "Question",
    entityId: questionId,
    changes: { assessmentId },
  });

  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: assessmentInclude,
  });
  return serializeAssessmentDetail(assessment);
}
