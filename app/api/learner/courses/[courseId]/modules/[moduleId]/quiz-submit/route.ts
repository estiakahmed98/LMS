import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LearnerAuthError,
  requireApprovedEnrollment,
  requireLearner,
} from "@/lib/learner-auth-server";
import { updateEnrollmentProgress } from "@/lib/learner-enrollment-progress";
import {
  hasUnlockDelayElapsed,
  hasWatchedEnough,
  isModuleComplete,
  remainingUnlockSeconds,
} from "@/lib/learner-course-progress";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
) {
  try {
    const { courseId, moduleId } = await params;
    const currentUser = await requireLearner("/courses", {
      module: "ASSESSMENTS",
      action: "create",
    });
    const body = await request.json();

    const answers = body.answers as Record<string, number>;

    const module = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    // Both players measure real playback, so any module with a video gates
    // its quiz on watched percentage; one with nothing to play uses the timer.
    const hasMeasurableVideo = Boolean(
      module?.videoUrl || module?.youtubeVideoId,
    );

    if (!module || !module.quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    await requireApprovedEnrollment(currentUser.id, courseId);

    // Sequential access: earlier modules must be finished (quiz included)
    // before this module's quiz can be submitted.
    const previousModules = await prisma.module.findMany({
      where: { courseId, order: { lt: module.order } },
      select: {
        hasQuiz: true,
        videoProgress: {
          where: { userId: currentUser.id },
          select: { completed: true, quizPassed: true },
        },
      },
    });

    const hasLockedPredecessor = previousModules.some(
      (item) =>
        !isModuleComplete({
          completed: item.videoProgress[0]?.completed ?? false,
          hasQuiz: item.hasQuiz,
          quizPassed: item.videoProgress[0]?.quizPassed ?? false,
        }),
    );

    if (hasLockedPredecessor) {
      return NextResponse.json(
        { error: "Complete the previous module to unlock this one." },
        { status: 403 },
      );
    }

    const videoProgress = await prisma.videoProgress.findUnique({
      where: {
        userId_moduleId: {
          userId: currentUser.id,
          moduleId,
        },
      },
    });

    // The quiz opens on whichever gate applies: watch percentage when there
    // is a video we can measure, or the elapsed-time timer when there is
    // nothing to play and so no percentage to read.
    const videoReady = hasMeasurableVideo
      ? hasWatchedEnough(videoProgress?.watchedPercent)
      : hasUnlockDelayElapsed(videoProgress?.openedAt ?? null);

    if (!videoReady) {
      return NextResponse.json(
        {
          error: hasMeasurableVideo
            ? "Keep watching the video before taking the quiz."
            : "Please spend a little more time on this module first.",
          remainingSeconds: hasMeasurableVideo
            ? undefined
            : remainingUnlockSeconds(videoProgress?.openedAt ?? null),
        },
        { status: 403 },
      );
    }

    const totalMarks = module.quiz.questions.reduce(
      (sum, question) => sum + question.marks,
      0,
    );

    const obtainedMarks = module.quiz.questions.reduce((sum, question) => {
      return answers?.[question.id] === question.correctIndex
        ? sum + question.marks
        : sum;
    }, 0);
    const correctCount = module.quiz.questions.filter(
      (question) => answers?.[question.id] === question.correctIndex,
    ).length;

    const score =
      totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

    const passed = score >= module.quiz.passingScore;

    let nextModuleId: string | null = null;

    if (passed) {
      await prisma.videoProgress.upsert({
        where: {
          userId_moduleId: {
            userId: currentUser.id,
            moduleId,
          },
        },
        update: {
          completed: true,
          quizPassed: true,
        },
        create: {
          userId: currentUser.id,
          moduleId,
          completed: true,
          quizPassed: true,
          watchedPercent: 100,
          positionSeconds: 0,
          durationSeconds: 0,
        },
      });

      await updateEnrollmentProgress(currentUser.id, module.courseId);

      const nextModule = await prisma.module.findFirst({
        where: {
          courseId: module.courseId,
          order: {
            gt: module.order,
          },
        },
        orderBy: {
          order: "asc",
        },
        select: {
          id: true,
        },
      });

      nextModuleId = nextModule?.id ?? null;
    }

    return NextResponse.json({
      passed,
      score,
      correctCount,
      passingScore: module.quiz.passingScore,
      courseId: module.courseId,
      nextModuleId,
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("QUIZ_SUBMIT_ERROR", error);

    return NextResponse.json(
      { error: "Failed to submit quiz." },
      { status: 500 },
    );
  }
}
