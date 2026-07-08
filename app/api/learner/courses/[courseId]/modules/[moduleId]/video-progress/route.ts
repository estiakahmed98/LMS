import { NextResponse } from "next/server";
import { getCurrentUserServer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
    const currentUser = await getCurrentUserServer("/courses");
    const body = await request.json();

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        courseId: true,
        order: true,
        hasQuiz: true,
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
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

    const watchedPercent = Number(body.watchedPercent ?? 100);
    const durationSeconds = Number(body.durationSeconds ?? 0);
    const positionSeconds = Number(body.positionSeconds ?? durationSeconds);

    const shouldCompleteModule = !module.hasQuiz && watchedPercent >= 95;

    await prisma.videoProgress.upsert({
      where: {
        userId_moduleId: {
          userId: currentUser.id,
          moduleId,
        },
      },
      update: {
        watchedPercent,
        durationSeconds,
        positionSeconds,
        completed: shouldCompleteModule ? true : undefined,
      },
      create: {
        userId: currentUser.id,
        moduleId,
        watchedPercent,
        durationSeconds,
        positionSeconds,
        completed: shouldCompleteModule,
      },
    });

    await updateEnrollmentProgress(currentUser.id, module.courseId);

    let nextModuleId: string | null = null;

    if (shouldCompleteModule) {
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
      success: true,
      videoWatched: watchedPercent >= 95,
      moduleCompleted: shouldCompleteModule,
      courseId: module.courseId,
      nextModuleId,
    });
  } catch (error) {
    console.error("VIDEO_PROGRESS_ERROR", error);

    return NextResponse.json(
      { error: "Failed to save video progress." },
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
  const completed = modules.filter((m) => m.videoProgress[0]?.completed).length;
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