import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import type {
  AdminAssessmentDetail,
  AdminAssessmentPayload,
  AdminAssessmentSummary,
  AdminQuestionPayload,
  AssessmentTypeValue,
  DifficultyValue,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";
import { Prisma } from "@/lib/generated/prisma/client";

const assessmentTypeValues: AssessmentTypeValue[] = ["MCQ", "WRITTEN", "PRACTICAL"];
const questionTypeValues: QuestionTypeValue[] = ["MCQ", "WRITTEN", "PRACTICAL"];
const difficultyValues: DifficultyValue[] = ["EASY", "MEDIUM", "HARD"];

const assessmentInclude = {
  course: { select: { id: true, title: true } },
  questions: true,
} satisfies Prisma.AssessmentInclude;

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

export async function listAssessments(courseId?: string, type?: AssessmentTypeValue) {
  const assessments = await prisma.assessment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      ...(type ? { type } : {}),
    },
    include: assessmentInclude,
    orderBy: { createdAt: "desc" },
  });

  return assessments.map(serializeAssessment);
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
  await prisma.assessment.delete({ where: { id } });

  await auditLogEntry({
    actorId,
    action: "assessment.deleted",
    entity: "Assessment",
    entityId: id,
  });
}

export async function createQuestion(
  assessmentId: string,
  payload: AdminQuestionPayload,
  actorId: string | null = null,
) {
  const question = await prisma.question.create({
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
    },
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
