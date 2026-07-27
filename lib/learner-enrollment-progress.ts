import { prisma } from "@/lib/prisma";
import { calculateCourseProgress } from "@/lib/learner-course-progress";

/**
 * Recomputes and persists a learner's course progress from module completion.
 *
 * Shared by the module-progress and quiz-submit endpoints so both agree on
 * what counts as complete — in particular, a module with a quiz only counts
 * once that quiz is passed.
 */
export async function updateEnrollmentProgress(
  userId: string,
  courseId: string,
) {
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    select: {
      hasQuiz: true,
      videoProgress: {
        where: { userId },
        select: { completed: true, quizPassed: true },
      },
    },
  });

  const { completedCount, progress } = calculateCourseProgress(
    modules.map((module) => ({
      completed: module.videoProgress[0]?.completed ?? false,
      hasQuiz: module.hasQuiz,
      quizPassed: module.videoProgress[0]?.quizPassed ?? false,
    })),
  );

  await prisma.enrollment.update({
    where: {
      userId_courseId: { userId, courseId },
    },
    data: {
      progress,
      completedAt: progress === 100 ? new Date() : null,
    },
  });

  return { completedCount, progress, totalCount: modules.length };
}
