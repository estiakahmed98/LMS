import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LearnerAuthError,
  requireApprovedEnrollment,
  requireLearner,
} from "@/lib/learner-auth-server";
import {
  calculateCourseProgress,
  effectiveDurationMinutes,
  getLinearModuleStatuses,
} from "@/lib/learner-course-progress";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const currentUser = await requireLearner("/courses");
    await requireApprovedEnrollment(currentUser.id, courseId);

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: currentUser.id,
          courseId,
        },
      },
      select: {
        status: true,
        progress: true,
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            durationHours: true,
            coverImage: true,
            modules: {
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                courseId: true,
                title: true,
                order: true,
                type: true,
                durationMinutes: true,
                coverImage: true,
                videoUrl: true,
                youtubeVideoId: true,
                overview: true,
                hasQuiz: true,
                videoProgress: {
                  where: {
                    userId: currentUser.id,
                  },
                  select: {
                    completed: true,
                    quizPassed: true,
                    watchedPercent: true,
                    durationSeconds: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new LearnerAuthError("You are not enrolled in this course.", 404);
    }

    const completionStates = enrollment.course.modules.map((module) => ({
      completed: module.videoProgress[0]?.completed ?? false,
      hasQuiz: module.hasQuiz,
      quizPassed: module.videoProgress[0]?.quizPassed ?? false,
    }));

    const statuses = getLinearModuleStatuses(completionStates);
    const { completedCount, progress } = calculateCourseProgress(completionStates);

    const modules = enrollment.course.modules.map((module, index) => {
      const videoProgress = module.videoProgress[0];

      return {
        id: module.id,
        courseId: module.courseId,
        title: module.title,
        order: module.order,
        type: module.type,
        // Shown once a player has measured the real length — both the
        // uploaded-file and YouTube players do. Null until then, rather than
        // an admin-typed guess.
        durationMinutes: effectiveDurationMinutes(
          videoProgress?.durationSeconds,
        ),
        coverImage: module.coverImage,
        videoUrl: module.videoUrl,
        youtubeVideoId: module.youtubeVideoId,
        overview: module.overview,
        hasQuiz: module.hasQuiz,
        watchedPercent: videoProgress?.watchedPercent ?? 0,
        status: statuses[index],
      };
    });

    return NextResponse.json({
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        durationHours: enrollment.course.durationHours,
        coverImage: enrollment.course.coverImage,
        // Derived from module completion rather than the stored column, so the
        // page is correct even if an earlier write left the column stale.
        progress,
        completedCount,
        modules,
      },
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_COURSE_DETAIL_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load course." },
      { status: 500 },
    );
  }
}
