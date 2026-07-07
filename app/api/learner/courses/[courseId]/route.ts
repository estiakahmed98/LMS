import { NextResponse } from "next/server";
import { getCurrentUserServer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

type ModuleStatus = "completed" | "current" | "locked";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const currentUser = await getCurrentUserServer("/courses");

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
                overview: true,
                hasQuiz: true,
                videoProgress: {
                  where: {
                    userId: currentUser.id,
                  },
                  select: {
                    completed: true,
                    watchedPercent: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "You are not enrolled in this course." },
        { status: 404 },
      );
    }

    if (enrollment.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Your enrollment is not approved yet." },
        { status: 403 },
      );
    }

    let currentFound = false;

    const modules = enrollment.course.modules.map((module) => {
      const progress = module.videoProgress[0];
      const completed = Boolean(progress?.completed);

      let status: ModuleStatus;

      if (completed) {
        status = "completed";
      } else if (!currentFound) {
        status = "current";
        currentFound = true;
      } else {
        status = "locked";
      }

      return {
        id: module.id,
        courseId: module.courseId,
        title: module.title,
        order: module.order,
        type: module.type,
        durationMinutes: module.durationMinutes,
        coverImage: module.coverImage,
        videoUrl: module.videoUrl,
        overview: module.overview,
        hasQuiz: module.hasQuiz,
        watchedPercent: progress?.watchedPercent ?? 0,
        status,
      };
    });

    return NextResponse.json({
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        durationHours: enrollment.course.durationHours,
        coverImage: enrollment.course.coverImage,
        progress: enrollment.progress,
        modules,
      },
    });
  } catch (error) {
    console.error("LEARNER_COURSE_DETAIL_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load course." },
      { status: 500 },
    );
  }
}