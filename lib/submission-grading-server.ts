import { auditLogEntry } from "@/lib/audit";
import {
  decodeAssessmentSubmissionPayload,
} from "@/lib/assessment-submission-payload";
import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import { canInstructorUseCourse, isInstructorRole } from "@/lib/portal-access";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { Prisma, Role } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveGradingWorkflow } from "@/lib/grading-workflow-server";
import {
  assertRolePermission,
  requireActiveUser,
} from "@/lib/rbac";
import type {
  CheckerReviewPayload,
  GradingQueueCounts,
  GradingQueueFilter,
  GradingQueueItem,
  GradingQueueListFilters,
  GradingQueueListResult,
  GradingSubmissionDetail,
  ManualReviewStatusValue,
  MakerReviewPayload,
  SubmissionGradeLinePayload,
  SubmissionInboxFilters,
  SubmissionInboxListResult,
  SubmissionInboxStats,
} from "@/lib/submission-grading-types";

type ManualReviewStatus =
  | "NOT_REQUIRED"
  | "PENDING_MAKER"
  | "MAKER_DRAFT"
  | "PENDING_CHECKER"
  | "RETURNED_TO_MAKER"
  | "FINALIZED";

type GradingActor = {
  id: string;
  role: Role;
  scopedCourseIds: Set<string> | null;
};

const gradingSubmissionInclude = {
  user: { select: { id: true, name: true, email: true } },
  maker: { select: { id: true, name: true } },
  checker: { select: { id: true, name: true } },
  assessment: {
    select: {
      id: true,
      title: true,
      type: true,
      totalMarks: true,
      passingMarks: true,
      courseId: true,
      course: { select: { id: true, title: true } },
      questions: {
        select: {
          id: true,
          question: true,
          type: true,
          marks: true,
          options: true,
        },
        orderBy: { id: "asc" },
      },
    },
  },
  questionGrades: {
    select: {
      questionId: true,
      makerMarks: true,
      makerComment: true,
      checkerMarks: true,
      checkerComment: true,
    },
  },
} satisfies Prisma.SubmissionInclude;

type SubmissionWithGrading = Prisma.SubmissionGetPayload<{
  include: typeof gradingSubmissionInclude;
}>;

export class SubmissionGradingError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 401 | 403 | 404 | 409,
  ) {
    super(message);
    this.name = "SubmissionGradingError";
  }
}

async function listInstructorScopedCourseIds(userId: string) {
  return listInstructorAssignedCourseIds(userId);
}

async function requireScopedActor(
  module: PermissionModule,
  action: "view" | "edit",
): Promise<GradingActor> {
  const user = await requireActiveUser();

  if (user.role === Role.STUDENT) {
    throw new SubmissionGradingError("Staff access required.", 403);
  }

  await assertRolePermission(user.role, module, action);

  return {
    id: user.id,
    role: user.role,
    scopedCourseIds: isInstructorRole(user.role)
      ? await listInstructorScopedCourseIds(user.id)
      : null,
  };
}

async function requireGradingActor(action: "view" | "edit") {
  return requireScopedActor(PermissionModule.GRADING, action);
}

async function requireSubmissionActor(action: "view" | "edit") {
  return requireScopedActor(PermissionModule.SUBMISSIONS, action);
}

function scopeWhereForActor(actor: GradingActor): Prisma.SubmissionWhereInput {
  if (!actor.scopedCourseIds) return {};

  return {
    assessment: {
      courseId: { in: [...actor.scopedCourseIds] },
    },
  };
}

function queueWhere(filter: GradingQueueFilter): Prisma.SubmissionWhereInput {
  switch (filter) {
    case "maker":
      return {
        manualReviewStatus: {
          in: ["PENDING_MAKER", "MAKER_DRAFT", "RETURNED_TO_MAKER"],
        },
      };
    case "checker":
      return { manualReviewStatus: "PENDING_CHECKER" };
    case "returned":
      return { manualReviewStatus: "RETURNED_TO_MAKER" };
    case "finalized":
      return { manualReviewStatus: "FINALIZED" };
    default:
      return { manualReviewStatus: { not: "NOT_REQUIRED" } };
  }
}

function serializeQueueItem(submission: SubmissionWithGrading): GradingQueueItem {
  return {
    id: submission.id,
    learnerId: submission.user.id,
    learnerName: submission.user.name,
    courseId: submission.assessment.course.id,
    courseTitle: submission.assessment.course.title,
    assessmentId: submission.assessment.id,
    assessmentTitle: submission.assessment.title,
    assessmentType: submission.assessment.type as GradingQueueItem["assessmentType"],
    submissionStatus: submission.status,
    manualReviewStatus:
      submission.manualReviewStatus as GradingQueueItem["manualReviewStatus"],
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    updatedAt: submission.updatedAt.toISOString(),
    makerId: submission.maker?.id ?? null,
    makerName: submission.maker?.name ?? null,
    checkerId: submission.checker?.id ?? null,
    checkerName: submission.checker?.name ?? null,
    obtainedMarks: submission.obtainedMarks,
    totalMarks: submission.assessment.totalMarks,
    pendingChecker: submission.manualReviewStatus === "PENDING_CHECKER",
  };
}

function ensureActorCanUseCourse(actor: GradingActor, courseId: string) {
  if (!actor.scopedCourseIds) return;
  if (canInstructorUseCourse(actor.scopedCourseIds, courseId)) return;

  throw new SubmissionGradingError(
    "You can only grade submissions from courses assigned to you.",
    403,
  );
}

async function getScopedSubmissionOrThrow(
  actor: GradingActor,
  submissionId: string,
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: gradingSubmissionInclude,
  });

  if (!submission) {
    throw new SubmissionGradingError("Submission not found.", 404);
  }

  ensureActorCanUseCourse(actor, submission.assessment.courseId);
  if (actor.role === Role.INSTRUCTOR) {
    const makerStage = ["PENDING_MAKER", "MAKER_DRAFT", "RETURNED_TO_MAKER"].includes(
      submission.manualReviewStatus,
    );
    if (makerStage && submission.makerId && submission.makerId !== actor.id) {
      throw new SubmissionGradingError("This submission is assigned to a different maker.", 403);
    }
    if (
      submission.manualReviewStatus === "PENDING_CHECKER" &&
      submission.checkerId &&
      submission.checkerId !== actor.id
    ) {
      throw new SubmissionGradingError("This submission is assigned to a different checker.", 403);
    }
  }
  return submission;
}

function normalizeComment(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeOverallMarks(
  value: unknown,
  maxMarks: number,
  label: string,
) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > maxMarks) {
    throw new SubmissionGradingError(
      `${label} must be a whole number between 0 and ${maxMarks}.`,
      400,
    );
  }
  return parsed;
}

function normalizeGradePayload(
  grades: SubmissionGradeLinePayload[],
  questions: SubmissionWithGrading["assessment"]["questions"],
) {
  const byQuestionId = new Map(
    questions.map((question) => [question.id, question]),
  );
  const seen = new Set<string>();

  return grades.map((grade) => {
    const question = byQuestionId.get(grade.questionId);
    if (!question) {
      throw new SubmissionGradingError("Grade payload references an unknown question.", 400);
    }
    if (seen.has(question.id)) {
      throw new SubmissionGradingError("Duplicate question grade payload.", 400);
    }
    seen.add(question.id);

    const marks =
      grade.marks === null || grade.marks === undefined
        ? null
        : Number(grade.marks);

    if (
      marks !== null &&
      (!Number.isInteger(marks) || marks < 0 || marks > question.marks)
    ) {
      throw new SubmissionGradingError(
        `Marks for "${question.question}" must be between 0 and ${question.marks}.`,
        400,
      );
    }

    return {
      questionId: question.id,
      marks,
      comment: normalizeComment(grade.comment),
      maxMarks: question.marks,
    };
  });
}

function totalFromGrades(
  grades: ReturnType<typeof normalizeGradePayload>,
  questionCount: number,
  overallMarks: number | null,
) {
  if (questionCount === 0) {
    return {
      total: overallMarks,
      complete: overallMarks !== null,
    };
  }

  const provided = new Map(grades.map((grade) => [grade.questionId, grade]));
  let total = 0;
  let complete = true;

  for (const grade of provided.values()) {
    total += grade.marks ?? 0;
    if (grade.marks === null) complete = false;
  }

  if (provided.size < questionCount) {
    complete = false;
  }

  return { total, complete };
}

async function upsertMakerGrades(
  tx: Prisma.TransactionClient,
  submissionId: string,
  grades: ReturnType<typeof normalizeGradePayload>,
) {
  for (const grade of grades) {
    await tx.submissionQuestionGrade.upsert({
      where: {
        submissionId_questionId: {
          submissionId,
          questionId: grade.questionId,
        },
      },
      create: {
        submissionId,
        questionId: grade.questionId,
        makerMarks: grade.marks,
        makerComment: grade.comment,
      },
      update: {
        makerMarks: grade.marks,
        makerComment: grade.comment,
      },
    });
  }
}

async function upsertCheckerGrades(
  tx: Prisma.TransactionClient,
  submissionId: string,
  grades: ReturnType<typeof normalizeGradePayload>,
) {
  for (const grade of grades) {
    await tx.submissionQuestionGrade.upsert({
      where: {
        submissionId_questionId: {
          submissionId,
          questionId: grade.questionId,
        },
      },
      create: {
        submissionId,
        questionId: grade.questionId,
        checkerMarks: grade.marks,
        checkerComment: grade.comment,
      },
      update: {
        checkerMarks: grade.marks,
        checkerComment: grade.comment,
      },
    });
  }
}

function fallbackCheckerGrades(
  submission: SubmissionWithGrading,
  incoming: ReturnType<typeof normalizeGradePayload>,
) {
  if (incoming.length > 0) return incoming;

  return submission.assessment.questions.map((question) => {
    const existing = submission.questionGrades.find(
      (grade) => grade.questionId === question.id,
    );
    return {
      questionId: question.id,
      marks: existing?.makerMarks ?? null,
      comment: existing?.makerComment ?? null,
      maxMarks: question.marks,
    };
  });
}

function gradingAssessmentScope(actor: GradingActor): Prisma.SubmissionWhereInput["assessment"] {
  return {
    type: { in: ["WRITTEN", "PRACTICAL"] },
    ...(actor.scopedCourseIds ? { courseId: { in: [...actor.scopedCourseIds] } } : {}),
  };
}

export async function listGradingQueue(
  filters: GradingQueueListFilters = {},
): Promise<GradingQueueListResult> {
  const actor = await requireGradingActor("view");
  const queue = filters.queue ?? "maker";
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.SubmissionWhereInput = {
    ...scopeWhereForActor(actor),
    ...queueWhere(queue),
    assessment: gradingAssessmentScope(actor),
    ...(actor.role === Role.INSTRUCTOR && (queue === "maker" || queue === "returned")
      ? { OR: [{ makerId: null }, { makerId: actor.id }] }
      : actor.role === Role.INSTRUCTOR && queue === "checker"
        ? { OR: [{ checkerId: null }, { checkerId: actor.id }] }
        : {}),
  };

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: gradingSubmissionInclude,
      orderBy: [{ submittedAt: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    submissions: submissions.map(serializeQueueItem),
    total,
    page,
    pageSize,
  };
}

export async function getGradingQueueCounts(): Promise<GradingQueueCounts> {
  const actor = await requireGradingActor("view");
  const baseWhere: Prisma.SubmissionWhereInput = {
    ...scopeWhereForActor(actor),
    assessment: gradingAssessmentScope(actor),
  };

  const withQueue = (queue: GradingQueueFilter): Prisma.SubmissionWhereInput => ({
    ...baseWhere,
    ...queueWhere(queue),
    ...(actor.role === Role.INSTRUCTOR && (queue === "maker" || queue === "returned")
      ? { OR: [{ makerId: null }, { makerId: actor.id }] }
      : actor.role === Role.INSTRUCTOR && queue === "checker"
        ? { OR: [{ checkerId: null }, { checkerId: actor.id }] }
        : {}),
  });

  const [maker, checker, returned, finalized, all] = await Promise.all([
    prisma.submission.count({ where: withQueue("maker") }),
    prisma.submission.count({ where: withQueue("checker") }),
    prisma.submission.count({ where: withQueue("returned") }),
    prisma.submission.count({ where: withQueue("finalized") }),
    prisma.submission.count({ where: withQueue("all") }),
  ]);

  return { maker, checker, returned, finalized, all };
}

function inboxScopeWhere(
  actor: GradingActor,
  filters: Pick<SubmissionInboxFilters, "courseId" | "search" | "dateFrom" | "dateTo">,
): Prisma.SubmissionWhereInput {
  const andConditions: Prisma.SubmissionWhereInput[] = [];

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    andConditions.push({
      OR: [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { assessment: { title: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    andConditions.push({
      submittedAt: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lt: new Date(filters.dateTo) } : {}),
      },
    });
  }

  return {
    ...scopeWhereForActor(actor),
    assessment: {
      type: { in: ["WRITTEN", "PRACTICAL"] },
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(actor.scopedCourseIds
        ? { courseId: { in: [...actor.scopedCourseIds] } }
        : {}),
    },
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };
}

export async function listSubmissionInbox(
  filters: SubmissionInboxFilters = {},
): Promise<SubmissionInboxListResult> {
  const actor = await requireSubmissionActor("view");
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.SubmissionWhereInput = {
    ...inboxScopeWhere(actor, filters),
    ...(filters.status ? { manualReviewStatus: filters.status } : {}),
  };

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: gradingSubmissionInclude,
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.submission.count({ where }),
  ]);

  return {
    submissions: submissions.map(serializeQueueItem),
    total,
    page,
    pageSize,
  };
}

export async function getSubmissionInboxStats(
  filters: Pick<SubmissionInboxFilters, "courseId" | "search" | "dateFrom" | "dateTo"> = {},
): Promise<SubmissionInboxStats> {
  const actor = await requireSubmissionActor("view");
  const baseWhere = inboxScopeWhere(actor, filters);

  const withStatus = (status: ManualReviewStatusValue): Prisma.SubmissionWhereInput => ({
    ...baseWhere,
    manualReviewStatus: status,
  });

  const [all, pendingMaker, makerDraft, pendingChecker, returnedToMaker, finalized] =
    await Promise.all([
      prisma.submission.count({ where: baseWhere }),
      prisma.submission.count({ where: withStatus("PENDING_MAKER") }),
      prisma.submission.count({ where: withStatus("MAKER_DRAFT") }),
      prisma.submission.count({ where: withStatus("PENDING_CHECKER") }),
      prisma.submission.count({ where: withStatus("RETURNED_TO_MAKER") }),
      prisma.submission.count({ where: withStatus("FINALIZED") }),
    ]);

  return { all, pendingMaker, makerDraft, pendingChecker, returnedToMaker, finalized };
}

export async function listSubmissionInboxCourseOptions() {
  const actor = await requireSubmissionActor("view");
  const courses = await prisma.course.findMany({
    where: {
      assessments: {
        some: {
          type: { in: ["WRITTEN", "PRACTICAL"] },
          submissions: { some: {} },
        },
      },
      ...(actor.scopedCourseIds ? { id: { in: [...actor.scopedCourseIds] } } : {}),
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return courses;
}

export async function getGradingSubmissionDetail(submissionId: string) {
  const actor = await requireGradingActor("view");
  return getSubmissionDetailForActor(actor, submissionId);
}

export async function getSubmissionInboxDetail(submissionId: string) {
  const actor = await requireSubmissionActor("view");
  return getSubmissionDetailForActor(actor, submissionId);
}

export async function getSubmissionInboxLearnerHistory(submissionId: string) {
  const actor = await requireSubmissionActor("view");
  const selected = await getScopedSubmissionOrThrow(actor, submissionId);
  const submissions = await prisma.submission.findMany({
    where: {
      ...scopeWhereForActor(actor),
      userId: selected.user.id,
      assessment: {
        type: { in: ["WRITTEN", "PRACTICAL"] },
        ...(actor.scopedCourseIds
          ? { courseId: { in: [...actor.scopedCourseIds] } }
          : {}),
      },
    },
    include: gradingSubmissionInclude,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
  });

  return {
    learner: {
      id: selected.user.id,
      name: selected.user.name,
      email: selected.user.email,
    },
    submission: serializeSubmissionDetail(selected),
    submissions: submissions.map(serializeSubmissionDetail),
  };
}

async function getSubmissionDetailForActor(
  actor: GradingActor,
  submissionId: string,
) {
  const submission = await getScopedSubmissionOrThrow(actor, submissionId);
  return serializeSubmissionDetail(submission);
}

function serializeSubmissionDetail(submission: SubmissionWithGrading) {
  const payload = decodeAssessmentSubmissionPayload(submission.answerSheetUrls);
  const gradeByQuestionId = new Map(
    submission.questionGrades.map((grade) => [grade.questionId, grade]),
  );

  const detail: GradingSubmissionDetail = {
    ...serializeQueueItem(submission),
    answerPayload: payload,
    makerComment: submission.makerComment,
    checkerComment: submission.checkerComment,
    returnReason: submission.returnReason,
    makerTotalMarks: submission.makerTotalMarks,
    checkerTotalMarks: submission.checkerTotalMarks,
    makerMarkedAt: submission.makerMarkedAt?.toISOString() ?? null,
    makerSubmittedAt: submission.makerSubmittedAt?.toISOString() ?? null,
    checkedAt: submission.checkedAt?.toISOString() ?? null,
    questions: submission.assessment.questions.map((question) => {
      const answer = payload?.answers?.[question.id];
      return {
        questionId: question.id,
        prompt: question.question,
        type: question.type,
        maxMarks: question.marks,
        options: question.options,
        learnerAnswer: Array.isArray(answer) ? answer.join(", ") : answer ?? null,
        makerMarks: gradeByQuestionId.get(question.id)?.makerMarks ?? null,
        makerComment: gradeByQuestionId.get(question.id)?.makerComment ?? null,
        checkerMarks: gradeByQuestionId.get(question.id)?.checkerMarks ?? null,
        checkerComment: gradeByQuestionId.get(question.id)?.checkerComment ?? null,
      };
    }),
  };

  return detail;
}

export async function saveMakerReview(
  submissionId: string,
  payload: MakerReviewPayload,
) {
  const actor = await requireGradingActor("edit");
  const submission = await getScopedSubmissionOrThrow(actor, submissionId);

  if (submission.manualReviewStatus === "FINALIZED") {
    throw new SubmissionGradingError("This submission has already been finalized.", 409);
  }

  const grades = normalizeGradePayload(payload.grades ?? [], submission.assessment.questions);
  const overallMarks = normalizeOverallMarks(
    payload.overallMarks,
    submission.assessment.totalMarks,
    "Maker total marks",
  );
  const totals = totalFromGrades(
    grades,
    submission.assessment.questions.length,
    overallMarks,
  );

  if (payload.action === "submit-for-checker" && !totals.complete) {
    throw new SubmissionGradingError(
      "Complete maker marks are required before sending to checker.",
      400,
    );
  }

  const now = new Date();
  const workflow = payload.action === "submit-for-checker"
    ? await resolveGradingWorkflow({
        courseId: submission.assessment.courseId,
        studentId: submission.user.id,
        makerId: actor.id,
      })
    : null;

  if (workflow?.requiresChecker && workflow.checkerId === actor.id) {
    throw new SubmissionGradingError(
      `Workflow rule "${workflow.ruleName ?? "Default"}" assigns the maker as checker. Update the rule before submitting.`,
      409,
    );
  }
  const directFinalize = payload.action === "submit-for-checker" && workflow?.requiresChecker === false;

  await prisma.$transaction(async (tx) => {
    await upsertMakerGrades(tx, submission.id, grades);
    await tx.submission.update({
      where: { id: submission.id },
      data: {
        status: directFinalize ? "GRADED" : "GRADING",
        manualReviewStatus:
          payload.action === "submit-for-checker"
            ? directFinalize ? "FINALIZED" : "PENDING_CHECKER"
            : "MAKER_DRAFT",
        makerId: actor.id,
        makerMarkedAt: now,
        makerSubmittedAt:
          payload.action === "submit-for-checker" ? now : submission.makerSubmittedAt,
        makerTotalMarks: totals.total,
        makerComment: normalizeComment(payload.comment),
        checkerId:
          payload.action === "submit-for-checker" && !directFinalize
            ? workflow?.checkerId ?? null
            : null,
        obtainedMarks: directFinalize ? totals.total : submission.obtainedMarks,
        gradedAt: directFinalize ? now : submission.gradedAt,
        checkedAt: null,
        checkerTotalMarks: null,
        checkerComment: null,
        returnReason: null,
      },
    });
  });

  await auditLogEntry({
    actorId: actor.id,
    action:
      payload.action === "submit-for-checker"
        ? directFinalize ? "submission.review.directly_finalized" : "submission.review.submitted"
        : "submission.review.saved",
    entity: "Submission",
    entityId: submission.id,
    changes: {
      manualReviewStatus:
        payload.action === "submit-for-checker"
          ? directFinalize ? "FINALIZED" : "PENDING_CHECKER"
          : "MAKER_DRAFT",
      makerTotalMarks: totals.total,
      workflowRuleId: workflow?.ruleId ?? null,
      checkerId: workflow?.checkerId ?? null,
    },
  });

  return getGradingSubmissionDetail(submission.id);
}

export async function applyCheckerReview(
  submissionId: string,
  payload: CheckerReviewPayload,
) {
  const actor = await requireGradingActor("edit");
  const submission = await getScopedSubmissionOrThrow(actor, submissionId);

  if (submission.makerId && submission.makerId === actor.id) {
    throw new SubmissionGradingError(
      "The maker cannot approve or return their own submission.",
      403,
    );
  }

  if (
    actor.role === Role.INSTRUCTOR &&
    submission.checkerId &&
    submission.checkerId !== actor.id
  ) {
    throw new SubmissionGradingError(
      "This submission is assigned to a different checker.",
      403,
    );
  }

  if (submission.manualReviewStatus !== "PENDING_CHECKER") {
    throw new SubmissionGradingError(
      "This submission is not waiting for checker review.",
      409,
    );
  }

  const normalizedIncoming = normalizeGradePayload(
    payload.grades ?? [],
    submission.assessment.questions,
  );
  const checkerGrades = fallbackCheckerGrades(submission, normalizedIncoming);
  const overallMarks = normalizeOverallMarks(
    payload.overallMarks,
    submission.assessment.totalMarks,
    "Checker total marks",
  );
  const totals = totalFromGrades(
    checkerGrades,
    submission.assessment.questions.length,
    overallMarks ?? submission.makerTotalMarks,
  );

  if (payload.action === "approve" && !totals.complete) {
    throw new SubmissionGradingError(
      "Complete checker marks are required before approval.",
      400,
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await upsertCheckerGrades(tx, submission.id, checkerGrades);
    await tx.submission.update({
      where: { id: submission.id },
      data:
        payload.action === "approve"
          ? {
              status: "GRADED",
              manualReviewStatus: "FINALIZED",
              obtainedMarks: totals.total,
              gradedAt: now,
              checkerId: actor.id,
              checkerTotalMarks: totals.total,
              checkerComment: normalizeComment(payload.comment),
              checkedAt: now,
              returnReason: null,
            }
          : {
              status: "GRADING",
              manualReviewStatus: "RETURNED_TO_MAKER",
              checkerId: actor.id,
              checkerTotalMarks: totals.total,
              checkerComment: normalizeComment(payload.comment),
              checkedAt: now,
              returnReason: normalizeComment(payload.comment),
            },
    });
  });

  await auditLogEntry({
    actorId: actor.id,
    action:
      payload.action === "approve"
        ? "submission.review.approved"
        : "submission.review.returned",
    entity: "Submission",
    entityId: submission.id,
    changes: {
      manualReviewStatus:
        payload.action === "approve" ? "FINALIZED" : "RETURNED_TO_MAKER",
      checkerTotalMarks: totals.total,
    },
  });

  return getGradingSubmissionDetail(submission.id);
}
