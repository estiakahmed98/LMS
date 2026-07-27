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
import {
  calculateCourseProgress,
  effectiveDurationMinutes,
  getLinearModuleStatuses,
  remainingUnlockSeconds,
  UNLOCK_DELAY_SECONDS,
} from "@/lib/learner-course-progress";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { getRolePermissions } from "@/lib/rbac";
import { hasModulePermission } from "@/lib/rbac-permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
) {
  try {
    const { courseId, moduleId } = await params;
    const currentUser = await requireLearner("/courses");
    await requireApprovedEnrollment(currentUser.id, courseId);
    const permissions = await getRolePermissions(currentUser.role);
    const canViewAssessments = hasModulePermission(
      permissions,
      PermissionModule.ASSESSMENTS,
      "view",
    );

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
            quizPassed: true,
            openedAt: true,
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
            quizPassed: true,
            watchedPercent: true,
            durationSeconds: true,
          },
        },
      },
    });

    const completionStates = courseModules.map((item) => ({
      completed: item.videoProgress[0]?.completed ?? false,
      hasQuiz: item.hasQuiz,
      quizPassed: item.videoProgress[0]?.quizPassed ?? false,
    }));

    const statuses = getLinearModuleStatuses(completionStates);
    const { progress: coursePercent } = calculateCourseProgress(completionStates);

    const modules: LearnerCourseModule[] = courseModules.map((item, index) => {
      const progress = item.videoProgress[0];

      return {
        id: item.id,
        courseId: item.courseId,
        title: item.title,
        order: item.order,
        type: item.type,
        // Shown once a player has measured the real length, whatever the
        // source. Null until then, rather than an admin-typed guess.
        durationMinutes: effectiveDurationMinutes(progress?.durationSeconds),
        coverImage: item.coverImage,
        videoUrl: item.videoUrl,
        youtubeVideoId: item.youtubeVideoId,
        overview: item.overview,
        hasQuiz: item.hasQuiz,
        watchedPercent: progress?.watchedPercent ?? 0,
        status: statuses[index],
      };
    });

    const currentProgress = module.videoProgress[0];

    const course: LearnerCourse = {
      id: module.course.id,
      title: module.course.title,
      description: module.course.description,
      durationHours: module.course.durationHours,
      coverImage: module.course.coverImage,
      progress: coursePercent,
      modules,
    };

    // Both players (uploaded file and YouTube IFrame) measure real position
    // and length, so either completes on watched percentage.
    const hasMeasurableVideo = Boolean(module.videoUrl || module.youtubeVideoId);

    const moduleData: LearnerCourseModule & {
      positionSeconds: number;
      durationSeconds: number;
      remainingUnlockSeconds: number;
      unlockDelaySeconds: number;
      hasMeasurableVideo: boolean;
    } = {
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      order: module.order,
      type: module.type,
      durationMinutes: effectiveDurationMinutes(
        currentProgress?.durationSeconds,
      ),
      coverImage: module.coverImage,
      videoUrl: module.videoUrl,
      youtubeVideoId: module.youtubeVideoId,
      overview: module.overview,
      hasQuiz: module.hasQuiz,
      status: statuses[
        courseModules.findIndex((item) => item.id === module.id)
      ] ?? "current",
      watchedPercent: currentProgress?.watchedPercent ?? 0,
      // Resume position, as last saved on the server — works across devices
      // and survives a crash, unlike the old localStorage-only save.
      positionSeconds: currentProgress?.positionSeconds ?? 0,
      durationSeconds: currentProgress?.durationSeconds ?? 0,
      // How much longer this module must stay open before it completes on the
      // TIME path. Only used by modules with no video to measure. 0 once the
      // wait is already served — including across a reload or a crash.
      remainingUnlockSeconds: remainingUnlockSeconds(currentProgress?.openedAt),
      unlockDelaySeconds: UNLOCK_DELAY_SECONDS,
      // Which completion path applies: watch-percent when there is a video we
      // can measure, elapsed-time when there is nothing to play.
      hasMeasurableVideo,
    };

    const quiz: LearnerQuiz | null =
      canViewAssessments && module.quiz
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
