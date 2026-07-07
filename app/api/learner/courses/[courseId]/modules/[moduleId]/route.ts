import { NextResponse } from "next/server";
import { getCurrentUserServer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
) {
  try {
    const { courseId, moduleId } = await params;
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
        notes: {
          orderBy: {
            id: "asc",
          },
        },
        resources: {
          orderBy: {
            id: "asc",
          },
        },
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

    const course = {
      id: module.course.id,
      title: module.course.title,
      description: module.course.description,
      duration: module.course.durationHours,
      durationHours: module.course.durationHours,
      coverImage: module.course.coverImage,
      progress: enrollment.progress,
    };

    const progress = module.videoProgress[0];

    const moduleData = {
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
      status: progress?.completed ? "completed" : "current",
      progress: progress?.watchedPercent ?? 0,
      positionSeconds: progress?.positionSeconds ?? 0,
      durationSeconds: progress?.durationSeconds ?? 0,
    };

    const quiz = module.quiz
      ? {
          id: module.quiz.id,
          moduleId: module.quiz.moduleId,
          passingScore: module.quiz.passingScore,
          questions: module.quiz.questions.map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            marks: q.marks,
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
    console.error("LEARNER_MODULE_DETAIL_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load module." },
      { status: 500 },
    );
  }
}