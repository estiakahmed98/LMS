import { auditLogEntry } from "@/lib/audit";
import { syncCohortMembers } from "@/lib/admin-cohort-server";
import { cohortCodeFromName } from "@/lib/cohort-code";
import {
  AssessmentAssignmentStatus,
  AssessmentAssignmentTarget,
  Role,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  AssessmentAssignmentData,
  AssessmentAssignmentItem,
  AssessmentAssignmentStatusValue,
  AssessmentAssignmentTargetValue,
  CreateAssessmentAssignmentInput,
} from "@/lib/assessment-assignment-types";

const ACTIVE_ACCOUNT_STATUSES = ["APPROVED", "ACTIVE"] as const;

export class AssessmentAssignmentError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "AssessmentAssignmentError";
  }
}

function parseOptionalDate(value: string | null | undefined, label: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AssessmentAssignmentError(`${label} is invalid.`);
  }
  return date;
}

function normalizeWindow(input: CreateAssessmentAssignmentInput) {
  const availableFrom = parseOptionalDate(input.availableFrom, "Available from");
  const dueAt = parseOptionalDate(input.dueAt, "Due date");
  if (availableFrom && dueAt && dueAt <= availableFrom) {
    throw new AssessmentAssignmentError("Due date must be after the availability date.");
  }
  const attemptLimit = Number(input.attemptLimit);
  if (!Number.isInteger(attemptLimit) || attemptLimit < 1 || attemptLimit > 10) {
    throw new AssessmentAssignmentError("Attempt limit must be between 1 and 10.");
  }
  if (!Object.values(AssessmentAssignmentStatus).includes(input.status as AssessmentAssignmentStatus)) {
    throw new AssessmentAssignmentError("Invalid assignment status.");
  }
  return {
    availableFrom,
    dueAt,
    attemptLimit,
    status: input.status as AssessmentAssignmentStatus,
  };
}

async function getAssessmentOrThrow(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, title: true, courseId: true, course: { select: { title: true } } },
  });
  if (!assessment) throw new AssessmentAssignmentError("Assessment not found.", 404);
  return assessment;
}

async function eligibleLearners(courseId: string) {
  return prisma.user.findMany({
    where: {
      role: Role.STUDENT,
      status: { in: [...ACTIVE_ACCOUNT_STATUSES] },
      enrollments: { some: { courseId, status: "APPROVED" } },
    },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });
}

export async function getAssessmentAssignmentData(
  assessmentId: string,
): Promise<AssessmentAssignmentData> {
  const assessment = await getAssessmentOrThrow(assessmentId);
  const [learners, batches, assignments] = await Promise.all([
    eligibleLearners(assessment.courseId),
    prisma.batch.findMany({
      where: {
        OR: [
          { courseId: assessment.courseId },
          {
            batchCourses: {
              some: { courseId: assessment.courseId, status: "ACTIVE" },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        memberships: { where: { status: "ACTIVE" }, select: { userId: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      include: {
        batch: { select: { name: true, _count: { select: { memberships: true } } } },
        learner: { select: { name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const serialized: AssessmentAssignmentItem[] = assignments.map((assignment) => ({
    id: assignment.id,
    targetType: assignment.targetType,
    targetLabel:
      assignment.targetType === "COURSE"
        ? `All enrolled learners in ${assessment.course.title}`
        : assignment.targetType === "BATCH"
          ? assignment.batch?.name ?? "Deleted batch"
          : assignment.learner?.name ?? assignment.learner?.email ?? "Deleted learner",
    targetKey: assignment.targetKey,
    batchId: assignment.batchId,
    learnerId: assignment.learnerId,
    status: assignment.status,
    availableFrom: assignment.availableFrom?.toISOString() ?? null,
    dueAt: assignment.dueAt?.toISOString() ?? null,
    attemptLimit: assignment.attemptLimit,
    recipientCount:
      assignment.targetType === "COURSE"
        ? learners.length
        : assignment.targetType === "BATCH"
          ? (assignment.batch?._count.memberships ?? 0)
          : 1,
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }));

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      courseId: assessment.courseId,
      courseTitle: assessment.course.title,
    },
    assignments: serialized,
    batches: batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      status: batch.status,
      startDate: batch.startDate?.toISOString() ?? null,
      endDate: batch.endDate?.toISOString() ?? null,
      memberIds: batch.memberships.map((membership) => membership.userId),
    })),
    learners,
  };
}

export async function createAssessmentAssignments(
  assessmentId: string,
  input: CreateAssessmentAssignmentInput,
  actorId: string | null,
) {
  const assessment = await getAssessmentOrThrow(assessmentId);
  const window = normalizeWindow(input);
  if (!Object.values(AssessmentAssignmentTarget).includes(input.targetType as AssessmentAssignmentTarget)) {
    throw new AssessmentAssignmentError("Invalid assignment target.");
  }

  let targets: Array<{ targetKey: string; batchId: string | null; learnerId: string | null }>;
  if (input.targetType === "COURSE") {
    targets = [{ targetKey: "COURSE", batchId: null, learnerId: null }];
  } else if (input.targetType === "BATCH") {
    if (!input.batchId) throw new AssessmentAssignmentError("Select a batch.");
    const batch = await prisma.batch.findFirst({
      where: {
        id: input.batchId,
        status: "ACTIVE",
        OR: [
          { courseId: assessment.courseId },
          { batchCourses: { some: { courseId: assessment.courseId, status: "ACTIVE" } } },
        ],
      },
      select: { id: true },
    });
    if (!batch) throw new AssessmentAssignmentError("Selected active batch was not found.", 404);
    targets = [{ targetKey: `BATCH:${batch.id}`, batchId: batch.id, learnerId: null }];
  } else {
    const learnerIds = [...new Set(input.learnerIds ?? [])];
    if (learnerIds.length === 0) throw new AssessmentAssignmentError("Select at least one learner.");
    const validLearners = await prisma.user.findMany({
      where: {
        id: { in: learnerIds },
        role: Role.STUDENT,
        status: { in: [...ACTIVE_ACCOUNT_STATUSES] },
        enrollments: { some: { courseId: assessment.courseId, status: "APPROVED" } },
      },
      select: { id: true },
    });
    if (validLearners.length !== learnerIds.length) {
      throw new AssessmentAssignmentError("One or more learners are not eligible for this course.");
    }
    targets = validLearners.map((learner) => ({
      targetKey: `LEARNER:${learner.id}`,
      batchId: null,
      learnerId: learner.id,
    }));
  }

  await prisma.$transaction(
    targets.map((target) =>
      prisma.assessmentAssignment.upsert({
        where: { assessmentId_targetKey: { assessmentId, targetKey: target.targetKey } },
        update: { ...window, batchId: target.batchId, learnerId: target.learnerId },
        create: {
          assessmentId,
          targetType: input.targetType as AssessmentAssignmentTarget,
          ...target,
          ...window,
          createdById: actorId,
        },
      }),
    ),
  );

  await auditLogEntry({
    actorId,
    action: "assessment.assignment.saved",
    entity: "Assessment",
    entityId: assessmentId,
    changes: { targetType: input.targetType, targetCount: targets.length, ...window },
  });
  return getAssessmentAssignmentData(assessmentId);
}

export async function createAssessmentBatch(
  assessmentId: string,
  input: { name?: string; startDate?: string | null; endDate?: string | null },
  actorId: string | null,
) {
  const assessment = await getAssessmentOrThrow(assessmentId);
  const name = input.name?.trim();
  if (!name) throw new AssessmentAssignmentError("Batch name is required.");
  const startDate = parseOptionalDate(input.startDate, "Start date");
  const endDate = parseOptionalDate(input.endDate, "End date");
  if (startDate && endDate && endDate <= startDate) {
    throw new AssessmentAssignmentError("Batch end date must be after its start date.");
  }
  const code = `${cohortCodeFromName(name)}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  const batch = await prisma.batch.create({
    data: {
      code,
      name,
      courseId: assessment.courseId,
      status: "ACTIVE",
      startDate,
      endDate,
      batchCourses: { create: { courseId: assessment.courseId } },
    },
  });
  await auditLogEntry({
    actorId,
    action: "batch.created",
    entity: "Batch",
    entityId: batch.id,
    changes: { name, courseId: assessment.courseId },
  });
  return getAssessmentAssignmentData(assessmentId);
}

export async function syncAssessmentBatchMembers(
  assessmentId: string,
  batchId: string,
  userIds: string[],
  actorId: string | null,
) {
  const assessment = await getAssessmentOrThrow(assessmentId);
  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      status: "ACTIVE",
      OR: [
        { courseId: assessment.courseId },
        { batchCourses: { some: { courseId: assessment.courseId, status: "ACTIVE" } } },
      ],
    },
    select: { id: true },
  });
  if (!batch) throw new AssessmentAssignmentError("Selected active batch was not found.", 404);
  const uniqueUserIds = [...new Set(userIds)];
  const eligible = await eligibleLearners(assessment.courseId);
  const eligibleIds = new Set(eligible.map((learner) => learner.id));
  if (uniqueUserIds.some((userId) => !eligibleIds.has(userId))) {
    throw new AssessmentAssignmentError("A batch member is not an approved learner in this course.");
  }

  await syncCohortMembers(batchId, uniqueUserIds, actorId);
  return getAssessmentAssignmentData(assessmentId);
}

export async function updateAssessmentAssignmentStatus(
  assessmentId: string,
  assignmentId: string,
  status: AssessmentAssignmentStatusValue,
  actorId: string | null,
) {
  if (!Object.values(AssessmentAssignmentStatus).includes(status as AssessmentAssignmentStatus)) {
    throw new AssessmentAssignmentError("Invalid assignment status.");
  }
  const result = await prisma.assessmentAssignment.updateMany({
    where: { id: assignmentId, assessmentId },
    data: { status: status as AssessmentAssignmentStatus },
  });
  if (!result.count) throw new AssessmentAssignmentError("Assignment not found.", 404);
  await auditLogEntry({
    actorId,
    action: "assessment.assignment.status_updated",
    entity: "AssessmentAssignment",
    entityId: assignmentId,
    changes: { assessmentId, status },
  });
  return getAssessmentAssignmentData(assessmentId);
}

export async function deleteAssessmentAssignment(
  assessmentId: string,
  assignmentId: string,
  actorId: string | null,
) {
  const result = await prisma.assessmentAssignment.deleteMany({
    where: { id: assignmentId, assessmentId },
  });
  if (!result.count) throw new AssessmentAssignmentError("Assignment not found.", 404);
  await auditLogEntry({
    actorId,
    action: "assessment.assignment.deleted",
    entity: "AssessmentAssignment",
    entityId: assignmentId,
    changes: { assessmentId },
  });
  return getAssessmentAssignmentData(assessmentId);
}
