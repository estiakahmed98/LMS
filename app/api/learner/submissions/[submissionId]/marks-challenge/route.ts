import { NextResponse } from "next/server";
import { requireLearnerAccount } from "@/lib/learner-assessment-server";
import { prisma } from "@/lib/prisma";
import { invalidateLearnerData } from "@/lib/learner-cache";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> },
) {
  try {
    const learner = await requireLearnerAccount("view");
    const { submissionId } = await params;
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, userId: learner.id },
      select: {
        id: true,
        status: true,
        manualReviewStatus: true,
        obtainedMarks: true,
        marksChallengeStatus: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }
    if (submission.manualReviewStatus !== "FINALIZED" || submission.obtainedMarks === null) {
      return NextResponse.json(
        { error: "Marks can be challenged after grading is finalized." },
        { status: 409 },
      );
    }
    if (submission.marksChallengeStatus !== "NONE") {
      return NextResponse.json(
        { error: "A marks challenge has already been submitted." },
        { status: 409 },
      );
    }

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        marksChallengeStatus: "REQUESTED",
        marksChallengeRequestedAt: new Date(),
      },
      select: {
        marksChallengeStatus: true,
        marksChallengeRequestedAt: true,
      },
    });

    invalidateLearnerData();

    return NextResponse.json({
      marksChallengeStatus: updated.marksChallengeStatus,
      marksChallengeRequestedAt: updated.marksChallengeRequestedAt?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const typed = error as Error & { status: number };
      return NextResponse.json({ error: typed.message }, { status: typed.status });
    }
    console.error("MARKS_CHALLENGE_REQUEST_ERROR", error);
    return NextResponse.json({ error: "Failed to submit marks challenge." }, { status: 500 });
  }
}
