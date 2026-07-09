import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LearnerAuthError, requireLearner } from "@/lib/learner-auth-server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const currentUser = await requireLearner("/courses");
    const body = await request.json();

    const answers = body.answers as Record<string, number>;

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!module || !module.quiz) {
      return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: currentUser.id,
          courseId: module.courseId,
        },
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Enrollment is not approved." },
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

    if (!videoProgress || videoProgress.watchedPercent < 95) {
      return NextResponse.json(
        { error: "Please complete the video before taking the quiz." },
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
          watchedPercent: 100,
        },
        create: {
          userId: currentUser.id,
          moduleId,
          completed: true,
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

async function updateEnrollmentProgress(userId: string, courseId: string) {
  const modules = await prisma.module.findMany({
    where: { courseId },
    select: {
      id: true,
      videoProgress: {
        where: { userId },
        select: {
          completed: true,
        },
      },
    },
  });

  const total = modules.length;

  const completed = modules.filter(
    (module) => module.videoProgress[0]?.completed,
  ).length;

  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  await prisma.enrollment.update({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    data: {
      progress,
      completedAt: progress === 100 ? new Date() : null,
    },
  });
}