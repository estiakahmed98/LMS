import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LearnerAuthError,
  requireApprovedEnrollment,
  requireLearner,
} from "@/lib/learner-auth-server";
import { auditLogEntry } from "@/lib/audit";
import { updateEnrollmentProgress } from "@/lib/learner-enrollment-progress";
import {
  hasUnlockDelayElapsed,
  hasWatchedEnough,
  isModuleComplete,
  remainingUnlockSeconds,
  UNLOCK_DELAY_SECONDS,
} from "@/lib/learner-course-progress";

/** Longest plausible video, used to reject junk readings. */
const MAX_REASONABLE_SECONDS = 24 * 60 * 60;

/**
 * Drives module progress and unlocking. Three intents:
 *
 *   POST { intent: "open" }
 *     Records when the learner opened the module. Only meaningful for the
 *     TIME path (embedded links); harmless no-op data for uploaded videos.
 *
 *   POST { intent: "sync", positionSeconds, durationSeconds, watchedPercent }
 *     Periodic (~30s) position save for an uploaded video, plus on
 *     pause/unmount/tab-close. This is what lets playback resume from the
 *     same spot after a crash, a closed tab, or on a different device —
 *     the server is now the source of truth, not localStorage.
 *
 *   POST { intent: "complete" }
 *     Completes the module. Uploaded videos complete once their last
 *     synced watchedPercent clears the threshold; embedded links complete
 *     once the server sees the unlock delay elapsed since "open". Both
 *     checks are server-side — a client cannot forge either one.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
) {
  try {
    const { courseId, moduleId } = await params;
    // A learner recording their own watch progress is not editing the course,
    // so this needs COURSES:view rather than COURSES:edit (an admin-level
    // capability students do not have). Write access is scoped by the
    // approved-enrollment check below: you can only ever write your own row,
    // for a course you are enrolled in.
    const currentUser = await requireLearner("/courses", {
      module: "COURSES",
      action: "view",
    });
    const body = await request.json().catch(() => ({}));
    const intent =
      body?.intent === "open" || body?.intent === "sync"
        ? body.intent
        : "complete";

    const module = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: {
        id: true,
        courseId: true,
        order: true,
        hasQuiz: true,
        videoUrl: true,
        youtubeVideoId: true,
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    // Both our uploaded-file player and our YouTube IFrame player can measure
    // real playback position and length, so either kind of video completes on
    // watched percentage. Only a module with no video at all (reading/practice
    // with nothing to play) falls back to the elapsed-time gate.
    const hasMeasurableVideo = Boolean(module.videoUrl || module.youtubeVideoId);

    await requireApprovedEnrollment(currentUser.id, courseId);

    // Sequential access: every earlier module must be complete before this one
    // can be opened, synced, or completed. A module with a quiz is not
    // complete until that quiz is passed.
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

    const existing = await prisma.videoProgress.findUnique({
      where: {
        userId_moduleId: { userId: currentUser.id, moduleId },
      },
      select: {
        openedAt: true,
        completed: true,
        quizPassed: true,
        watchedPercent: true,
        positionSeconds: true,
        durationSeconds: true,
      },
    });

    // Stamp the open time once, on first open. Keeping the original timestamp
    // means re-opening a module does not restart the wait, so time already
    // spent is never lost to a reload or a dropped connection.
    if (intent === "open") {
      const openedAt = existing?.openedAt ?? new Date();

      await prisma.videoProgress.upsert({
        where: {
          userId_moduleId: { userId: currentUser.id, moduleId },
        },
        update: { openedAt },
        create: {
          userId: currentUser.id,
          moduleId,
          openedAt,
          completed: false,
        },
      });

      return NextResponse.json({
        success: true,
        openedAt,
        unlockDelaySeconds: UNLOCK_DELAY_SECONDS,
        remainingSeconds: remainingUnlockSeconds(openedAt),
        alreadyCompleted: existing?.completed ?? false,
      });
    }

    // Periodic position save (every ~30s, plus pause/unmount/tab-close). This
    // is the server-side resume point — a learner who closes the tab, loses
    // power, or comes back on a different device resumes from here rather
    // than from browser localStorage, which does not survive any of those.
    if (intent === "sync") {
      const rawPosition = Number(body.positionSeconds);
      const rawDuration = Number(body.durationSeconds);
      const rawPercent = Number(body.watchedPercent);

      const durationSeconds =
        Number.isFinite(rawDuration) &&
        rawDuration > 0 &&
        rawDuration <= MAX_REASONABLE_SECONDS
          ? rawDuration
          : existing?.durationSeconds ?? 0;

      const positionSeconds = Number.isFinite(rawPosition)
        ? Math.max(0, Math.min(rawPosition, durationSeconds || rawPosition))
        : existing?.positionSeconds ?? 0;

      // Never let a resumed-from-scratch playback erase a higher watermark —
      // rewatching the first half must not un-complete an already-watched
      // module.
      const watchedPercent = Math.max(
        existing?.watchedPercent ?? 0,
        Number.isFinite(rawPercent) ? Math.min(100, Math.max(0, rawPercent)) : 0,
      );

      await prisma.videoProgress.upsert({
        where: {
          userId_moduleId: { userId: currentUser.id, moduleId },
        },
        update: { positionSeconds, durationSeconds, watchedPercent },
        create: {
          userId: currentUser.id,
          moduleId,
          positionSeconds,
          durationSeconds,
          watchedPercent,
          completed: false,
        },
      });

      return NextResponse.json({ success: true });
    }

    // Completion path.
    //
    // A module with a real video completes on watched percentage. A module
    // with nothing to play has no percentage to measure, so it falls back to
    // the elapsed-time gate measured from "open".
    const readyToComplete = hasMeasurableVideo
      ? hasWatchedEnough(existing?.watchedPercent)
      : hasUnlockDelayElapsed(existing?.openedAt ?? null);

    if (!readyToComplete) {
      return NextResponse.json(
        {
          error: hasMeasurableVideo
            ? "Keep watching to unlock the next module."
            : "This module is still in progress.",
          remainingSeconds: hasMeasurableVideo
            ? undefined
            : remainingUnlockSeconds(existing?.openedAt ?? null),
          unlockDelaySeconds: UNLOCK_DELAY_SECONDS,
        },
        { status: 403 },
      );
    }

    await prisma.videoProgress.update({
      where: {
        userId_moduleId: { userId: currentUser.id, moduleId },
      },
      data: {
        completed: true,
        watchedPercent: hasMeasurableVideo
          ? existing?.watchedPercent ?? 100
          : 100,
      },
    });

    const moduleCompleted = isModuleComplete({
      completed: true,
      hasQuiz: module.hasQuiz,
      quizPassed: existing?.quizPassed ?? false,
    });

    const { progress } = await updateEnrollmentProgress(
      currentUser.id,
      module.courseId,
    );

    // Learner progress belongs in the trail too: completion is what drives
    // unlocking and, eventually, certificates, so it must be reviewable.
    await auditLogEntry({
      actorId: currentUser.id,
      action: "module.completed",
      entity: "Module",
      entityId: moduleId,
      changes: {
        courseId: module.courseId,
        moduleOrder: module.order,
        completedVia: hasMeasurableVideo ? "watch_percent" : "time_elapsed",
        watchedPercent: existing?.watchedPercent ?? null,
        courseProgress: progress,
      },
    });

    // Only hand back the next module once this one is genuinely finished —
    // a quiz module still needs its quiz passed.
    let nextModuleId: string | null = null;

    if (moduleCompleted) {
      const nextModule = await prisma.module.findFirst({
        where: {
          courseId: module.courseId,
          order: { gt: module.order },
        },
        orderBy: { order: "asc" },
        select: { id: true },
      });

      nextModuleId = nextModule?.id ?? null;
    }

    return NextResponse.json({
      success: true,
      moduleCompleted,
      requiresQuiz: module.hasQuiz && !(existing?.quizPassed ?? false),
      progress,
      courseId: module.courseId,
      nextModuleId,
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("VIDEO_PROGRESS_ERROR", error);

    return NextResponse.json(
      { error: "Failed to save module progress." },
      { status: 500 },
    );
  }
}
