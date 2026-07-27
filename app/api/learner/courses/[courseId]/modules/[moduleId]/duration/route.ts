import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LearnerAuthError,
  requireApprovedEnrollment,
  requireLearner,
} from "@/lib/learner-auth-server";

/** Longest plausible video, used to reject junk readings. */
const MAX_REASONABLE_SECONDS = 24 * 60 * 60;

/**
 * Records the real length of an uploaded module video, as measured by the
 * player once its metadata loads.
 *
 * This is the only way we learn a module's true length: external embeds
 * (YouTube, Facebook, Vimeo) will not reveal a duration to a server-side
 * request, and an admin-typed estimate is not trustworthy enough to display.
 * Stored per learner on their own progress row, which is where the course
 * endpoints already read it from.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; moduleId: string }> },
) {
  try {
    const { courseId, moduleId } = await params;
    // Recording a measured video length is a learner-side observation, not a
    // course edit — see the note in the video-progress route.
    const currentUser = await requireLearner("/courses", {
      module: "COURSES",
      action: "view",
    });
    const body = await request.json().catch(() => ({}));

    const durationSeconds = Number(body?.durationSeconds);

    if (
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0 ||
      durationSeconds > MAX_REASONABLE_SECONDS
    ) {
      return NextResponse.json(
        { error: "Invalid duration." },
        { status: 400 },
      );
    }

    const module = await prisma.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    await requireApprovedEnrollment(currentUser.id, courseId);

    await prisma.videoProgress.upsert({
      where: {
        userId_moduleId: { userId: currentUser.id, moduleId },
      },
      update: { durationSeconds },
      create: {
        userId: currentUser.id,
        moduleId,
        durationSeconds,
        completed: false,
      },
    });

    return NextResponse.json({ success: true, durationSeconds });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("MODULE_DURATION_ERROR", error);

    return NextResponse.json(
      { error: "Failed to save duration." },
      { status: 500 },
    );
  }
}
