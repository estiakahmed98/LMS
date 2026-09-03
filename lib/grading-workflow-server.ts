import { auditLogEntry } from "@/lib/audit";
import { Role } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/rbac";
import type {
  GradingWorkflowConfiguration,
  GradingWorkflowRulePayload,
  ResolvedGradingWorkflow,
} from "@/lib/grading-workflow-types";

export class GradingWorkflowError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "GradingWorkflowError";
  }
}

async function requireWorkflowAdmin() {
  const user = await requireActiveUser();
  if (user.role === Role.STUDENT || user.role === Role.INSTRUCTOR) {
    throw new GradingWorkflowError("Only administrators can manage grading workflow rules.", 403);
  }
  return user;
}

const ruleInclude = {
  course: { select: { title: true } },
  batch: { select: { name: true, code: true } },
  student: { select: { name: true } },
  maker: { select: { name: true } },
  checker: { select: { name: true } },
} as const;

function serializeRule(rule: Awaited<ReturnType<typeof prisma.gradingWorkflowRule.findFirst>> & {
  course?: { title: string } | null;
  batch?: { name: string; code: string } | null;
  student?: { name: string } | null;
  maker?: { name: string } | null;
  checker?: { name: string } | null;
}) {
  if (!rule) throw new GradingWorkflowError("Workflow rule not found.", 404);
  return {
    id: rule.id,
    name: rule.name,
    courseId: rule.courseId,
    batchId: rule.batchId,
    studentId: rule.studentId,
    makerId: rule.makerId,
    requiresChecker: Boolean(rule.checkerId),
    checkerId: rule.checkerId,
    priority: rule.priority,
    active: rule.active,
    courseName: rule.course?.title ?? null,
    batchName: rule.batch ? `${rule.batch.name} (${rule.batch.code})` : null,
    studentName: rule.student?.name ?? null,
    makerName: rule.maker?.name ?? null,
    checkerName: rule.checker?.name ?? null,
    updatedAt: rule.updatedAt.toISOString(),
  };
}

function nullableId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePayload(input: unknown): GradingWorkflowRulePayload {
  const raw = (input ?? {}) as Partial<GradingWorkflowRulePayload>;
  const name = String(raw.name ?? "").trim();
  const priority = Number(raw.priority ?? 0);
  if (!name || name.length > 120) throw new GradingWorkflowError("Rule name is required (maximum 120 characters).");
  if (!Number.isInteger(priority) || ![0, 250, 500, 1000].includes(priority)) {
    throw new GradingWorkflowError("Select a valid workflow status.");
  }
  const checkerId = nullableId(raw.checkerId);
  const requiresChecker = Boolean(checkerId);
  const makerId = nullableId(raw.makerId);
  if (requiresChecker && makerId && checkerId === makerId) {
    throw new GradingWorkflowError("Maker and checker must be different people.");
  }
  return {
    name,
    courseId: nullableId(raw.courseId),
    batchId: nullableId(raw.batchId),
    studentId: nullableId(raw.studentId),
    makerId,
    requiresChecker,
    checkerId: requiresChecker ? checkerId : null,
    priority,
    active: raw.active !== false,
  };
}

async function validateReferences(payload: GradingWorkflowRulePayload) {
  const ids = [payload.studentId, payload.makerId, payload.checkerId].filter(Boolean) as string[];
  const [course, batch, users] = await Promise.all([
    payload.courseId ? prisma.course.findUnique({ where: { id: payload.courseId }, select: { id: true } }) : null,
    payload.batchId ? prisma.batch.findUnique({ where: { id: payload.batchId }, select: { id: true } }) : null,
    ids.length ? prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, role: true } }) : [],
  ]);
  if (payload.courseId && !course) throw new GradingWorkflowError("Selected course was not found.");
  if (payload.batchId && !batch) throw new GradingWorkflowError("Selected batch was not found.");
  if (users.length !== new Set(ids).size) throw new GradingWorkflowError("One or more selected users were not found.");
  const student = users.find((user) => user.id === payload.studentId);
  if (student && student.role !== Role.STUDENT) throw new GradingWorkflowError("The selected student is not a learner.");
  for (const id of [payload.makerId, payload.checkerId]) {
    const grader = users.find((user) => user.id === id);
    if (grader?.role === Role.STUDENT) throw new GradingWorkflowError("Maker and checker must be staff users.");
  }
}

export async function getGradingWorkflowConfiguration(): Promise<GradingWorkflowConfiguration> {
  await requireWorkflowAdmin();
  const [rules, courses, batches, students, graders] = await Promise.all([
    prisma.gradingWorkflowRule.findMany({ include: ruleInclude, orderBy: [{ priority: "desc" }, { updatedAt: "desc" }] }),
    prisma.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.batch.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: Role.STUDENT, status: { in: ["ACTIVE", "APPROVED"] } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: { not: Role.STUDENT }, status: { in: ["ACTIVE", "APPROVED"] } }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    rules: rules.map(serializeRule),
    options: {
      courses: courses.map((item) => ({ id: item.id, name: item.title })),
      batches: batches.map((item) => ({ id: item.id, name: item.name, secondary: item.code })),
      students: students.map((item) => ({ id: item.id, name: item.name, secondary: item.email })),
      graders: graders.map((item) => ({ id: item.id, name: item.name, secondary: item.email })),
    },
  };
}

export async function createGradingWorkflowRule(input: unknown) {
  const actor = await requireWorkflowAdmin();
  const payload = normalizePayload(input);
  await validateReferences(payload);
  const rule = await prisma.gradingWorkflowRule.create({ data: { ...payload, createdById: actor.id }, include: ruleInclude });
  await auditLogEntry({ actorId: actor.id, action: "grading.workflow.created", entity: "GradingWorkflowRule", entityId: rule.id, changes: payload });
  return serializeRule(rule);
}

export async function updateGradingWorkflowRule(id: string, input: unknown) {
  const actor = await requireWorkflowAdmin();
  const payload = normalizePayload(input);
  await validateReferences(payload);
  const exists = await prisma.gradingWorkflowRule.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new GradingWorkflowError("Workflow rule not found.", 404);
  const rule = await prisma.gradingWorkflowRule.update({ where: { id }, data: payload, include: ruleInclude });
  await auditLogEntry({ actorId: actor.id, action: "grading.workflow.updated", entity: "GradingWorkflowRule", entityId: id, changes: payload });
  return serializeRule(rule);
}

export async function deleteGradingWorkflowRule(id: string) {
  const actor = await requireWorkflowAdmin();
  const exists = await prisma.gradingWorkflowRule.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new GradingWorkflowError("Workflow rule not found.", 404);
  await prisma.gradingWorkflowRule.delete({ where: { id } });
  await auditLogEntry({ actorId: actor.id, action: "grading.workflow.deleted", entity: "GradingWorkflowRule", entityId: id });
}

export async function resolveGradingWorkflow(input: { courseId: string; studentId: string; makerId: string }): Promise<ResolvedGradingWorkflow> {
  const memberships = await prisma.batchEnrollment.findMany({
    where: {
      status: "ACTIVE",
      enrollment: { userId: input.studentId, courseId: input.courseId },
      batchMembership: { status: "ACTIVE" },
      batchCourse: { status: "ACTIVE", courseId: input.courseId },
    },
    select: { batchMembership: { select: { batchId: true } } },
  });
  const batchIds = memberships.map((item) => item.batchMembership.batchId);
  const rules = await prisma.gradingWorkflowRule.findMany({
    where: {
      active: true,
      AND: [
        { OR: [{ courseId: null }, { courseId: input.courseId }] },
        { OR: [{ studentId: null }, { studentId: input.studentId }] },
        { OR: [{ makerId: null }, { makerId: input.makerId }] },
        { OR: [{ batchId: null }, ...(batchIds.length ? [{ batchId: { in: batchIds } }] : [])] },
      ],
    },
    include: { checker: { select: { name: true } } },
  });
  rules.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const specificity = (rule: typeof a) => [rule.courseId, rule.batchId, rule.studentId, rule.makerId].filter(Boolean).length;
    const diff = specificity(b) - specificity(a);
    return diff || b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const rule = rules[0];
  return rule ? {
    ruleId: rule.id,
    ruleName: rule.name,
    requiresChecker: Boolean(rule.checkerId),
    checkerId: rule.checkerId,
    checkerName: rule.checker?.name ?? null,
  } : { ruleId: null, ruleName: null, requiresChecker: false, checkerId: null, checkerName: null };
}
