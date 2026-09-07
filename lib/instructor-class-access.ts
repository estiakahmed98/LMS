import { prisma } from '@/lib/prisma';

/** Direct course assignments allow course-wide teaching. Batch-only assignments
 * remain restricted to the batches where the instructor is LEAD/ASSISTANT. */
export async function listInstructorCourseWideIds(instructorId: string) {
  const activeInstructor = { role: 'INSTRUCTOR' as const, status: { in: ['ACTIVE', 'APPROVED'] as ('ACTIVE' | 'APPROVED')[] } };
  const [enrollments, classes] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId: instructorId, status: 'APPROVED', user: activeInstructor },
      select: { courseId: true },
    }),
    prisma.liveClass.findMany({
      where: { instructorId, batchId: null, instructor: activeInstructor },
      select: { courseId: true },
      distinct: ['courseId'],
    }),
  ]);
  return new Set([...enrollments, ...classes].map(row => row.courseId));
}

export async function resolveCourseWideClassScope(instructorId: string, courseId: string, batchId: string | null) {
  if (batchId) throw new Error('Select a valid cohort course when choosing a batch.');
  if (!(await listInstructorCourseWideIds(instructorId)).has(courseId)) {
    throw new Error('A direct course teaching assignment is required to schedule for all enrolled learners. Select an assigned teaching batch instead.');
  }
  return { batchId: null, batchCourseId: null, batchName: 'All enrolled learners' };
}
