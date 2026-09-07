import { NextResponse } from "next/server";
import { EnrollmentStatus, Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission, requirePermission, RbacError } from "@/lib/rbac";
import { assignCourseToCohort, AdminCohortError } from "@/lib/admin-cohort-server";
import { auditLogEntry, getActorId } from "@/lib/audit";

const eligibleLearners = (courseId: string): Prisma.UserWhereInput => ({
  role: "STUDENT", status: { in: ["ACTIVE", "APPROVED"] },
  enrollments: { none: { courseId } },
});

const getLearners = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params;
  const searchParams = new URL(request.url).searchParams;
  const search = searchParams.get("search")?.trim().slice(0, 100) ?? "";
  const candidateSearch = searchParams.get("candidateSearch")?.trim().slice(0, 100) ?? "";
  const batchId = searchParams.get("batchId")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize")) || 25));

  const where: Prisma.EnrollmentWhereInput = {
    courseId,
    user: {
      role: "STUDENT",
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    ...(Object.values(EnrollmentStatus).includes(status as EnrollmentStatus)
      ? { status: status as EnrollmentStatus }
      : {}),
    ...(batchId
      ? {
          batchEnrollments: {
            some: {
              status: "ACTIVE",
              batchCourse: { courseId, batchId },
            },
          },
        }
      : {}),
  };

  const [rows, total, batches, candidates, availableBatches, eligibleCount] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      orderBy: [{ enrolledAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        batchEnrollments: {
          where: { status: "ACTIVE", batchCourse: { courseId } },
          select: {
            batchCourse: { select: { batch: { select: { id: true, name: true, code: true } } } },
          },
        },
      },
    }),
    prisma.enrollment.count({ where }),
    prisma.batchCourse.findMany({
      where: { courseId, status: "ACTIVE" },
      select: { batch: { select: { id: true, name: true, code: true } } },
      orderBy: { batch: { name: "asc" } },
    }),
    prisma.user.findMany({
          where: {
            role: "STUDENT",
            status: { in: ["ACTIVE", "APPROVED"] },
            OR: [
              { name: { contains: candidateSearch, mode: "insensitive" } },
              { email: { contains: candidateSearch, mode: "insensitive" } },
            ],
            enrollments: { none: { courseId } },
          },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
          take: 20,
        }),
    prisma.batch.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, code: true, _count: { select: { memberships: { where: { status: "ACTIVE" } } } } }, orderBy: { name: "asc" } }),
    prisma.user.count({ where: eligibleLearners(courseId) }),
  ]);

  return NextResponse.json({
    learners: rows.map((row) => ({
      enrollmentId: row.id,
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      userStatus: row.user.status,
      enrollmentStatus: row.status,
      progress: row.progress,
      enrolledAt: row.enrolledAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      batches: row.batchEnrollments.map((item) => item.batchCourse.batch),
    })),
    total,
    page,
    pageSize,
    batches: batches.map((item) => item.batch),
    candidates,
    availableBatches,
    eligibleCount,
  });
};

export const GET = withPermission(PermissionModule.STUDENTS, "view", getLearners);

export const POST = withPermission(PermissionModule.STUDENTS, "edit", async (
  request: Request, { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id: courseId } = await params;
    const input = await request.json();
    const actorId = await getActorId();
    if (input.mode === "batch" && typeof input.batchId === "string" && input.batchId.trim()) {
      await requirePermission(PermissionModule.COURSES, "edit");
      const result = await assignCourseToCohort(input.batchId.trim(), courseId, actorId);
      return NextResponse.json({ message: `Batch assigned. ${result.memberCount} active members have course access.` });
    }
    if (input.mode !== "all" || input.confirm !== true) return NextResponse.json({ error: "Select a batch or confirm enrollment of all eligible learners." }, { status: 400 });
    const count = await prisma.$transaction(async (tx) => {
      if (!await tx.course.findFirst({ where: { id: courseId, status: { not: "ARCHIVED" } }, select: { id: true } })) throw new AdminCohortError("Course is unavailable.");
      let cursor: string | undefined;
      let created = 0;
      while (true) {
        const users = await tx.user.findMany({ where: { ...eligibleLearners(courseId), ...(cursor ? { id: { gt: cursor } } : {}) }, select: { id: true }, orderBy: { id: "asc" }, take: 500 });
        if (!users.length) break;
        const result = await tx.enrollment.createMany({ data: users.map(({ id: userId }) => ({ userId, courseId, status: "APPROVED", directAssignment: true, directStatus: "APPROVED" })), skipDuplicates: true });
        created += result.count;
        cursor = users[users.length - 1].id;
      }
      return created;
    }, { timeout: 60000 });
    await auditLogEntry({ actorId, action: "course.learners.enrolled", entity: "Course", entityId: courseId, changes: { count } });
    return NextResponse.json({ message: `${count} learners enrolled. Existing enrollments were unchanged.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enrollment failed." }, { status: error instanceof AdminCohortError || error instanceof RbacError ? error.status : 500 });
  }
});
