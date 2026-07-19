import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LearnerAuthError,
  requireApprovedEnrollment,
  requireLearner,
} from "@/lib/learner-auth-server";
import type {
  LearnerCourse,
  LearnerCourseModule,
  LearnerQuiz,
} from "@/lib/learner-module-types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
) {
  try {
    const { courseId, moduleId } = await params;
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
      },
    });

    if (!enrollment) {
      throw new LearnerAuthError("You are not enrolled in this course.", 404);
    }

    const module = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            durationHours: true,
            coverImage: true,
          },
        },
        notes: true,
        resources: true,
        quiz: {
          include: {
            questions: true,
          },
        },
        videoProgress: {
          where: {
            userId: currentUser.id,
          },
          select: {
            positionSeconds: true,
            durationSeconds: true,
            watchedPercent: true,
            completed: true,
          },
        },
      },
    });

    if (!module) {
      return NextResponse.json(
        { error: "Module not found." },
        { status: 404 },
      );
    }

    const courseModules = await prisma.module.findMany({
      where: {
        courseId,
      },
      orderBy: {
        order: "asc",
      },
      include: {
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
    });

    let currentFound = false;

    const modules: LearnerCourseModule[] = courseModules.map((item) => {
      const progress = item.videoProgress[0];
      const completed = Boolean(progress?.completed);

      let status: "completed" | "current" | "locked";

      if (completed) {
        status = "completed";
      } else if (!currentFound) {
        status = "current";
        currentFound = true;
      } else {
        status = "locked";
      }

      return {
        id: item.id,
        courseId: item.courseId,
        title: item.title,
        order: item.order,
        type: item.type,
        durationMinutes: item.durationMinutes,
        coverImage: item.coverImage,
        videoUrl: item.videoUrl,
        overview: item.overview,
        hasQuiz: item.hasQuiz,
        watchedPercent: progress?.watchedPercent ?? 0,
        status,
      };
    });

    const currentProgress = module.videoProgress[0];

    const course: LearnerCourse = {
      id: module.course.id,
      title: module.course.title,
      description: module.course.description,
      durationHours: module.course.durationHours,
      coverImage: module.course.coverImage,
      progress: enrollment.progress,
      modules,
    };

    const moduleData: LearnerCourseModule & {
      positionSeconds: number;
      durationSeconds: number;
    } = {
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
      status: currentProgress?.completed ? "completed" : "current",
      watchedPercent: currentProgress?.watchedPercent ?? 0,
      positionSeconds: currentProgress?.positionSeconds ?? 0,
      durationSeconds: currentProgress?.durationSeconds ?? 0,
    };

    const quiz: LearnerQuiz | null = module.quiz
      ? {
          id: module.quiz.id,
          courseId: module.courseId,
          moduleId: module.quiz.moduleId,
          passingScore: module.quiz.passingScore,
          questions: module.quiz.questions.map((question) => ({
            id: question.id,
            question: question.question,
            options: question.options,
            marks: question.marks,
          })),
        }
      : null;

    const notes = module.notes.map((note) => ({
      id: note.id,
      heading: note.heading,
      body: note.body,
    }));

    const resources = module.resources.map((resource) => ({
      id: resource.id,
      title: resource.title,
      type: resource.type,
      meta: resource.meta,
      fileUrl: resource.fileUrl,
    }));

    return NextResponse.json({
      course,
      module: moduleData,
      quiz,
      notes,
      resources,
      userId: currentUser.id,
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_MODULE_DETAIL_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load module." },
      { status: 500 },
    );
  }
}
