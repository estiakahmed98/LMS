import "server-only";

import { prisma } from "@/lib/prisma";

export async function listInstructorAssignedCourseIds(
  instructorId: string,
): Promise<Set<string>> {
  const [enrollments, liveClasses, cohortAssignments] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId: instructorId,
        status: "APPROVED",
      },
      select: { courseId: true },
      distinct: ["courseId"],
    }),
    prisma.liveClass.findMany({
      where: { instructorId },
      select: { courseId: true },
      distinct: ["courseId"],
    }),
    prisma.batchCourseInstructor.findMany({
      where: {
        instructorId,
        status: "ACTIVE",
        batchCourse: {
          status: "ACTIVE",
          batch: { status: "ACTIVE" },
        },
      },
      select: { batchCourse: { select: { courseId: true } } },
    }),
  ]);

  return new Set([
    ...enrollments.map((row) => row.courseId),
    ...liveClasses.map((row) => row.courseId),
    ...cohortAssignments.map((row) => row.batchCourse.courseId),
  ]);
}

export async function listInstructorAssignedCourses(instructorId: string) {
  const assignedCourseIds = [...(await listInstructorAssignedCourseIds(instructorId))];

  if (assignedCourseIds.length === 0) {
    return [] as Array<{ id: string; title: string }>;
  }

  return prisma.course.findMany({
    where: { id: { in: assignedCourseIds } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}
