import { auditLogEntry, buildChangeDiff } from "@/lib/audit";
import type {
  AdminCohortDetail,
  AdminCohortInstructorInput,
  AdminCohortPayload,
  AdminCohortSummary,
  AdminCohortWorkspace,
} from "@/lib/admin-cohort-types";
import { normalizeCohortCode } from "@/lib/cohort-code";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  BatchCourseStatus,
  BatchEnrollmentStatus,
  BatchInstructorRole,
  BatchInstructorStatus,
  BatchMembershipStatus,
  BatchStatus,
  CourseStatus,
  Role,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const ACTIVE_ACCOUNT_STATUSES = ["ACTIVE", "APPROVED"] as const;
const MAX_BULK_SELECTION = 10_000;

export class AdminCohortError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "AdminCohortError";
  }
}

function parseDate(value: string | null | undefined, label: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AdminCohortError(`${label} is invalid.`);
  }
  return parsed;
}

export function normalizeCohortPayload(input: unknown): AdminCohortPayload {
  const raw = (input ?? {}) as Partial<AdminCohortPayload>;
  const code = normalizeCohortCode(raw.code ?? "");
  const name = raw.name?.trim() ?? "";
  const description = raw.description?.trim() || null;
  const timezone = raw.timezone?.trim() || "Asia/Dhaka";
  const status = String(raw.status ?? "DRAFT").toUpperCase();
  const startDate = parseDate(raw.startDate, "Start date");
  const endDate = parseDate(raw.endDate, "End date");
  const capacity = raw.capacity === null || raw.capacity === undefined
    ? null
    : Number(raw.capacity);

  if (code.length < 3) throw new AdminCohortError("Cohort code must be at least 3 characters.");
  if (!name) throw new AdminCohortError("Cohort name is required.");
  if (name.length > 120) throw new AdminCohortError("Cohort name is too long.");
  if (description && description.length > 500) {
    throw new AdminCohortError("Description must be 500 characters or fewer.");
  }
  if (!Object.values(BatchStatus).includes(status as BatchStatus)) {
    throw new AdminCohortError("Invalid cohort status.");
  }
  if (startDate && endDate && endDate <= startDate) {
    throw new AdminCohortError("End date must be after the start date.");
  }
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100_000)) {
    throw new AdminCohortError("Capacity must be between 1 and 100,000.");
  }
  if (timezone.length > 64) throw new AdminCohortError("Timezone is too long.");

  return {
    code,
    name,
    description,
    status: status as AdminCohortPayload["status"],
    startDate: startDate?.toISOString() ?? null,
    endDate: endDate?.toISOString() ?? null,
    capacity,
    timezone,
  };
}

export function normalizeIdSelection(input: unknown, field: string) {
  const raw = (input ?? {}) as Record<string, unknown>;
  const values = raw[field];
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    throw new AdminCohortError(`${field} must be an array of IDs.`);
  }
  const ids = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
  if (ids.length > MAX_BULK_SELECTION) {
    throw new AdminCohortError(`A maximum of ${MAX_BULK_SELECTION.toLocaleString()} records can be changed at once.`);
  }
  return ids;
}

export function normalizeInstructorAssignments(input: unknown): AdminCohortInstructorInput[] {
  const raw = (input ?? {}) as { assignments?: unknown };
  if (!Array.isArray(raw.assignments)) {
    throw new AdminCohortError("assignments must be an array.");
  }
  if (raw.assignments.length > MAX_BULK_SELECTION) {
    throw new AdminCohortError(`A maximum of ${MAX_BULK_SELECTION.toLocaleString()} assignments can be changed at once.`);
  }
  const assignments = raw.assignments.map((value) => {
    const item = (value ?? {}) as Partial<AdminCohortInstructorInput>;
    const batchCourseId = item.batchCourseId?.trim() ?? "";
    const instructorId = item.instructorId?.trim() ?? "";
    const role = String(item.role ?? "").toUpperCase();
    if (!batchCourseId || !instructorId || !Object.values(BatchInstructorRole).includes(role as BatchInstructorRole)) {
      throw new AdminCohortError("Every instructor assignment needs a valid course, instructor, and role.");
    }
    return { batchCourseId, instructorId, role: role as AdminCohortInstructorInput["role"] };
  });
  const keys = new Set(assignments.map((item) => `${item.batchCourseId}:${item.instructorId}:${item.role}`));
  if (keys.size !== assignments.length) {
    throw new AdminCohortError("Duplicate instructor assignments are not allowed.");
  }
  const leadCourses = assignments.filter((item) => item.role === "LEAD").map((item) => item.batchCourseId);
  if (new Set(leadCourses).size !== leadCourses.length) {
    throw new AdminCohortError("Each cohort course can have only one lead instructor.");
  }
  return assignments;
}

const summaryInclude = {
  batchCourses: {
    where: { status: BatchCourseStatus.ACTIVE },
    select: {
      id: true,
      batchEnrollments: {
        where: { status: BatchEnrollmentStatus.ACTIVE },
        select: { id: true },
      },
    },
  },
  memberships: {
    where: { status: BatchMembershipStatus.ACTIVE },
    select: { id: true },
  },
} satisfies Prisma.BatchInclude;

type SummaryRow = Prisma.BatchGetPayload<{ include: typeof summaryInclude }>;

function serializeSummary(row: SummaryRow): AdminCohortSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    capacity: row.capacity,
    timezone: row.timezone,
    courseCount: row.batchCourses.length,
    memberCount: row.memberships.length,
    enrollmentCount: row.batchCourses.reduce(
      (total, course) => total + course.batchEnrollments.length,
      0,
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const detailInclude = {
  batchCourses: {
    include: {
      course: { select: { id: true, title: true, status: true } },
      batchEnrollments: {
        where: { status: BatchEnrollmentStatus.ACTIVE },
        select: { id: true },
      },
      instructorAssignments: {
        where: { status: BatchInstructorStatus.ACTIVE },
        include: {
          instructor: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ role: "asc" as const }, { instructor: { name: "asc" as const } }],
      },
    },
    orderBy: { course: { title: "asc" as const } },
  },
  memberships: {
    include: {
      user: { select: { id: true, name: true, email: true, status: true } },
      batchEnrollments: {
        where: { status: BatchEnrollmentStatus.ACTIVE },
        select: { id: true },
      },
    },
    orderBy: { user: { name: "asc" as const } },
  },
} satisfies Prisma.BatchInclude;

type DetailRow = Prisma.BatchGetPayload<{ include: typeof detailInclude }>;

function serializeDetail(row: DetailRow): AdminCohortDetail {
  const activeCourses = row.batchCourses.filter((item) => item.status === BatchCourseStatus.ACTIVE);
  const activeMembers = row.memberships.filter((item) => item.status === BatchMembershipStatus.ACTIVE);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    capacity: row.capacity,
    timezone: row.timezone,
    courseCount: activeCourses.length,
    memberCount: activeMembers.length,
    enrollmentCount: activeCourses.reduce(
      (total, course) => total + course.batchEnrollments.length,
      0,
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    courses: activeCourses.map((item) => ({
      mappingId: item.id,
      id: item.course.id,
      title: item.course.title,
      status: item.course.status,
      enrollmentCount: item.batchEnrollments.length,
      instructors: item.instructorAssignments.map((assignment) => ({
        id: assignment.id,
        batchCourseId: item.id,
        instructorId: assignment.instructor.id,
        instructorName: assignment.instructor.name,
        instructorEmail: assignment.instructor.email,
        role: assignment.role,
        status: assignment.status,
      })),
    })),
    members: row.memberships.map((item) => ({
      membershipId: item.id,
      id: item.user.id,
      name: item.user.name,
      email: item.user.email,
      accountStatus: item.user.status,
      membershipStatus: item.status,
      joinedAt: item.joinedAt.toISOString(),
      leftAt: item.leftAt?.toISOString() ?? null,
      enrollmentCount: item.batchEnrollments.length,
    })),
  };
}

type Tx = Prisma.TransactionClient;
type MemberRef = { id: string; userId: string };
type CourseRef = { id: string; courseId: string };

async function materializeEnrollments(tx: Tx, members: MemberRef[], courses: CourseRef[]) {
  if (!members.length || !courses.length) return 0;
  const userIds = members.map((item) => item.userId);
  const courseIds = courses.map((item) => item.courseId);
  const existing = await tx.enrollment.findMany({
    where: { userId: { in: userIds }, courseId: { in: courseIds } },
    select: {
      id: true,
      userId: true,
      courseId: true,
      status: true,
      directAssignment: true,
      directStatus: true,
    },
  });
  const byPair = new Map(existing.map((item) => [`${item.userId}:${item.courseId}`, item]));
  const missing: Array<{
    userId: string;
    courseId: string;
    status: "APPROVED";
    directAssignment: false;
    directStatus: null;
  }> = [];
  for (const member of members) {
    for (const course of courses) {
      if (!byPair.has(`${member.userId}:${course.courseId}`)) {
        missing.push({
          userId: member.userId,
          courseId: course.courseId,
          status: "APPROVED",
          directAssignment: false,
          directStatus: null,
        });
      }
    }
  }
  if (missing.length) await tx.enrollment.createMany({ data: missing, skipDuplicates: true });
  for (const status of ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const) {
    await tx.enrollment.updateMany({
      where: {
        userId: { in: userIds },
        courseId: { in: courseIds },
        directAssignment: true,
        directStatus: null,
        status,
      },
      data: { directStatus: status },
    });
  }
  await tx.enrollment.updateMany({
    where: { userId: { in: userIds }, courseId: { in: courseIds } },
    data: { status: "APPROVED" },
  });
  const enrollments = await tx.enrollment.findMany({
    where: { userId: { in: userIds }, courseId: { in: courseIds } },
    select: { id: true, userId: true, courseId: true },
  });
  const enrollmentByPair = new Map(
    enrollments.map((item) => [`${item.userId}:${item.courseId}`, item.id]),
  );
  const grants = members.flatMap((member) =>
    courses.map((course) => ({
      batchMembershipId: member.id,
      batchCourseId: course.id,
      enrollmentId: enrollmentByPair.get(`${member.userId}:${course.courseId}`)!,
    })),
  );
  await tx.batchEnrollment.createMany({ data: grants, skipDuplicates: true });
  await tx.batchEnrollment.updateMany({
    where: {
      batchMembershipId: { in: members.map((item) => item.id) },
      batchCourseId: { in: courses.map((item) => item.id) },
    },
    data: { status: BatchEnrollmentStatus.ACTIVE },
  });
  return grants.length;
}

async function reconcileWithdrawnEnrollments(tx: Tx, enrollmentIds: string[]) {
  const ids = [...new Set(enrollmentIds)];
  if (!ids.length) return;
  await tx.enrollment.updateMany({
    where: {
      id: { in: ids },
      directAssignment: false,
      batchEnrollments: { none: { status: BatchEnrollmentStatus.ACTIVE } },
    },
    data: { status: "WITHDRAWN" },
  });
  for (const status of ["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"] as const) {
    await tx.enrollment.updateMany({
      where: {
        id: { in: ids },
        directAssignment: true,
        directStatus: status,
        batchEnrollments: { none: { status: BatchEnrollmentStatus.ACTIVE } },
      },
      data: { status },
    });
  }
}

async function withdrawGrants(tx: Tx, where: Prisma.BatchEnrollmentWhereInput) {
  const rows = await tx.batchEnrollment.findMany({ where, select: { enrollmentId: true } });
  if (!rows.length) return 0;
  await tx.batchEnrollment.updateMany({
    where,
    data: { status: BatchEnrollmentStatus.WITHDRAWN },
  });
  await reconcileWithdrawnEnrollments(tx, rows.map((item) => item.enrollmentId));
  return rows.length;
}

async function requireEditableCohort(tx: Tx, cohortId: string) {
  const cohort = await tx.batch.findUnique({
    where: { id: cohortId },
    select: { id: true, status: true, capacity: true },
  });
  if (!cohort) throw new AdminCohortError("Cohort not found.", 404);
  if (cohort.status === BatchStatus.ARCHIVED) {
    throw new AdminCohortError("Archived cohorts are read-only.", 409);
  }
  return cohort;
}

export async function listCohorts() {
  const rows = await prisma.batch.findMany({
    include: summaryInclude,
    orderBy: [{ status: "asc" }, { startDate: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(serializeSummary);
}

export async function getCohortWorkspace(cohortId: string): Promise<AdminCohortWorkspace> {
  const [cohort, courses, learners, instructors] = await Promise.all([
    prisma.batch.findUnique({ where: { id: cohortId }, include: detailInclude }),
    prisma.course.findMany({
      where: { status: { not: CourseStatus.ARCHIVED } },
      select: { id: true, title: true, status: true, level: true },
      orderBy: { title: "asc" },
    }),
    prisma.user.findMany({
      where: { role: Role.STUDENT, status: { in: [...ACTIVE_ACCOUNT_STATUSES] } },
      select: { id: true, name: true, email: true, status: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: Role.INSTRUCTOR, status: { in: [...ACTIVE_ACCOUNT_STATUSES] } },
      select: { id: true, name: true, email: true, status: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);
  if (!cohort) throw new AdminCohortError("Cohort not found.", 404);
  return {
    cohort: serializeDetail(cohort),
    catalog: {
      courses: courses.map((item) => ({ ...item, level: item.level })),
      learners,
      instructors,
    },
  };
}

export async function createCohort(payload: AdminCohortPayload, actorId: string | null) {
  if (payload.status !== "DRAFT") {
    throw new AdminCohortError("Create the cohort as a draft, then add courses and learners before activation.");
  }
  const row = await prisma.batch.create({
    data: {
      code: payload.code,
      name: payload.name,
      description: payload.description,
      status: payload.status as BatchStatus,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      capacity: payload.capacity,
      timezone: payload.timezone,
    },
    include: detailInclude,
  });
  await auditLogEntry({
    actorId,
    action: "cohort.created",
    entity: "Batch",
    entityId: row.id,
    changes: payload,
  });
  return serializeDetail(row);
}

export async function updateCohort(
  cohortId: string,
  payload: AdminCohortPayload,
  actorId: string | null,
) {
  const before = await prisma.batch.findUnique({ where: { id: cohortId } });
  if (!before) throw new AdminCohortError("Cohort not found.", 404);
  if (before.status === BatchStatus.ARCHIVED && payload.status !== "ARCHIVED") {
    throw new AdminCohortError("Archived cohorts cannot be reopened.", 409);
  }
  if (payload.capacity !== null) {
    const members = await prisma.batchMembership.count({
      where: { batchId: cohortId, status: BatchMembershipStatus.ACTIVE },
    });
    if (members > payload.capacity) {
      throw new AdminCohortError(`Capacity cannot be lower than the ${members} active members.`);
    }
  }
  if (payload.status === "ACTIVE" && before.status !== BatchStatus.ACTIVE) {
    const [courseCount, memberCount] = await Promise.all([
      prisma.batchCourse.count({
        where: { batchId: cohortId, status: BatchCourseStatus.ACTIVE },
      }),
      prisma.batchMembership.count({
        where: { batchId: cohortId, status: BatchMembershipStatus.ACTIVE },
      }),
    ]);
    if (!courseCount || !memberCount) {
      throw new AdminCohortError(
        "Add at least one course and one learner before activating the cohort.",
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.batch.update({
      where: { id: cohortId },
      data: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        status: payload.status as BatchStatus,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        capacity: payload.capacity,
        timezone: payload.timezone,
      },
    });
    if (payload.status === "ACTIVE") {
      const [members, courses] = await Promise.all([
        tx.batchMembership.findMany({
          where: { batchId: cohortId, status: BatchMembershipStatus.ACTIVE },
          select: { id: true, userId: true },
        }),
        tx.batchCourse.findMany({
          where: { batchId: cohortId, status: BatchCourseStatus.ACTIVE },
          select: { id: true, courseId: true },
        }),
      ]);
      await materializeEnrollments(tx, members, courses);
    } else if (before.status === BatchStatus.ACTIVE) {
      await withdrawGrants(tx, {
        batchCourse: { batchId: cohortId },
        status: BatchEnrollmentStatus.ACTIVE,
      });
    }
  });

  await auditLogEntry({
    actorId,
    action: payload.status === "ARCHIVED" ? "cohort.archived" : "cohort.updated",
    entity: "Batch",
    entityId: cohortId,
    changes: buildChangeDiff(
      before as unknown as Record<string, unknown>,
      payload as unknown as Record<string, unknown>,
    ),
  });
  return (await getCohortWorkspace(cohortId)).cohort;
}

export async function syncCohortCourses(
  cohortId: string,
  courseIds: string[],
  actorId: string | null,
) {
  const result = await prisma.$transaction(async (tx) => {
    const cohort = await requireEditableCohort(tx, cohortId);
    const validCourses = await tx.course.findMany({
      where: { id: { in: courseIds }, status: { not: CourseStatus.ARCHIVED } },
      select: { id: true },
    });
    if (validCourses.length !== courseIds.length) {
      throw new AdminCohortError("One or more selected courses are unavailable.");
    }
    const existing = await tx.batchCourse.findMany({
      where: { batchId: cohortId },
      select: { id: true, courseId: true, status: true },
    });
    const desired = new Set(courseIds);
    const removedIds = existing.filter((item) => !desired.has(item.courseId)).map((item) => item.id);
    if (removedIds.length) {
      await withdrawGrants(tx, {
        batchCourseId: { in: removedIds },
        status: BatchEnrollmentStatus.ACTIVE,
      });
      await tx.batchCourse.updateMany({
        where: { id: { in: removedIds } },
        data: { status: BatchCourseStatus.ARCHIVED },
      });
      await tx.batchCourseInstructor.updateMany({
        where: { batchCourseId: { in: removedIds }, status: BatchInstructorStatus.ACTIVE },
        data: { status: BatchInstructorStatus.ARCHIVED },
      });
    }
    for (const courseId of courseIds) {
      await tx.batchCourse.upsert({
        where: { batchId_courseId: { batchId: cohortId, courseId } },
        update: { status: BatchCourseStatus.ACTIVE },
        create: { batchId: cohortId, courseId },
      });
    }
    const activeCourses = await tx.batchCourse.findMany({
      where: { batchId: cohortId, status: BatchCourseStatus.ACTIVE },
      select: { id: true, courseId: true },
    });
    let grantCount = 0;
    if (cohort.status === BatchStatus.ACTIVE) {
      const members = await tx.batchMembership.findMany({
        where: { batchId: cohortId, status: BatchMembershipStatus.ACTIVE },
        select: { id: true, userId: true },
      });
      grantCount = await materializeEnrollments(tx, members, activeCourses);
    }
    return { courseCount: activeCourses.length, grantCount };
  });
  await auditLogEntry({
    actorId,
    action: "cohort.courses.synced",
    entity: "Batch",
    entityId: cohortId,
    changes: result,
  });
  return getCohortWorkspace(cohortId);
}

export async function syncCohortMembers(
  cohortId: string,
  userIds: string[],
  actorId: string | null,
) {
  const result = await prisma.$transaction(async (tx) => {
    const cohort = await requireEditableCohort(tx, cohortId);
    if (cohort.capacity !== null && userIds.length > cohort.capacity) {
      throw new AdminCohortError(`This cohort has a capacity of ${cohort.capacity} learners.`);
    }
    const validLearners = await tx.user.findMany({
      where: {
        id: { in: userIds },
        role: Role.STUDENT,
        status: { in: [...ACTIVE_ACCOUNT_STATUSES] },
      },
      select: { id: true },
    });
    if (validLearners.length !== userIds.length) {
      throw new AdminCohortError("One or more selected learners are not active student accounts.");
    }
    const existing = await tx.batchMembership.findMany({
      where: { batchId: cohortId },
      select: { id: true, userId: true, status: true },
    });
    const desired = new Set(userIds);
    const removed = existing.filter(
      (item) => item.status === BatchMembershipStatus.ACTIVE && !desired.has(item.userId),
    );
    if (removed.length) {
      await withdrawGrants(tx, {
        batchMembershipId: { in: removed.map((item) => item.id) },
        status: BatchEnrollmentStatus.ACTIVE,
      });
      await tx.batchMembership.updateMany({
        where: { id: { in: removed.map((item) => item.id) } },
        data: { status: BatchMembershipStatus.WITHDRAWN, leftAt: new Date() },
      });
    }
    for (const userId of userIds) {
      await tx.batchMembership.upsert({
        where: { batchId_userId: { batchId: cohortId, userId } },
        update: { status: BatchMembershipStatus.ACTIVE, leftAt: null },
        create: { batchId: cohortId, userId },
      });
    }
    const activeMembers = await tx.batchMembership.findMany({
      where: { batchId: cohortId, status: BatchMembershipStatus.ACTIVE },
      select: { id: true, userId: true },
    });
    let grantCount = 0;
    if (cohort.status === BatchStatus.ACTIVE) {
      const courses = await tx.batchCourse.findMany({
        where: { batchId: cohortId, status: BatchCourseStatus.ACTIVE },
        select: { id: true, courseId: true },
      });
      grantCount = await materializeEnrollments(tx, activeMembers, courses);
    }
    return { memberCount: activeMembers.length, grantCount };
  });
  await auditLogEntry({
    actorId,
    action: "cohort.members.synced",
    entity: "Batch",
    entityId: cohortId,
    changes: result,
  });
  return getCohortWorkspace(cohortId);
}

export async function syncCohortInstructors(
  cohortId: string,
  assignments: AdminCohortInstructorInput[],
  actorId: string | null,
) {
  const result = await prisma.$transaction(async (tx) => {
    await requireEditableCohort(tx, cohortId);
    const batchCourseIds = [...new Set(assignments.map((item) => item.batchCourseId))];
    const instructorIds = [...new Set(assignments.map((item) => item.instructorId))];
    const [courses, instructors, existing] = await Promise.all([
      tx.batchCourse.findMany({
        where: {
          id: { in: batchCourseIds },
          batchId: cohortId,
          status: BatchCourseStatus.ACTIVE,
        },
        select: { id: true },
      }),
      tx.user.findMany({
        where: {
          id: { in: instructorIds },
          role: Role.INSTRUCTOR,
          status: { in: [...ACTIVE_ACCOUNT_STATUSES] },
        },
        select: { id: true },
      }),
      tx.batchCourseInstructor.findMany({
        where: { batchCourse: { batchId: cohortId } },
        select: { id: true, batchCourseId: true, instructorId: true, role: true, status: true },
      }),
    ]);
    if (courses.length !== batchCourseIds.length) {
      throw new AdminCohortError("One or more selected cohort courses are unavailable.");
    }
    if (instructors.length !== instructorIds.length) {
      throw new AdminCohortError("One or more selected instructors are not active instructor accounts.");
    }
    const desired = new Set(
      assignments.map((item) => `${item.batchCourseId}:${item.instructorId}:${item.role}`),
    );
    const removedIds = existing
      .filter((item) => !desired.has(`${item.batchCourseId}:${item.instructorId}:${item.role}`))
      .map((item) => item.id);
    if (removedIds.length) {
      await tx.batchCourseInstructor.updateMany({
        where: { id: { in: removedIds } },
        data: { status: BatchInstructorStatus.ARCHIVED },
      });
    }
    for (const assignment of assignments) {
      await tx.batchCourseInstructor.upsert({
        where: {
          batchCourseId_instructorId_role: {
            batchCourseId: assignment.batchCourseId,
            instructorId: assignment.instructorId,
            role: assignment.role as BatchInstructorRole,
          },
        },
        update: { status: BatchInstructorStatus.ACTIVE },
        create: {
          batchCourseId: assignment.batchCourseId,
          instructorId: assignment.instructorId,
          role: assignment.role as BatchInstructorRole,
        },
      });
    }
    return { assignmentCount: assignments.length, archivedCount: removedIds.length };
  });
  await auditLogEntry({
    actorId,
    action: "cohort.instructors.synced",
    entity: "Batch",
    entityId: cohortId,
    changes: result,
  });
  return getCohortWorkspace(cohortId);
}
