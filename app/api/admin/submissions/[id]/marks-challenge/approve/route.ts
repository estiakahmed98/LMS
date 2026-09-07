import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, RbacError } from "@/lib/rbac";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const submission = await prisma.submission.findUnique({
      where: { id },
      select: { marksChallengeStatus: true },
    });
    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }
    if (submission.marksChallengeStatus !== "REQUESTED") {
      return NextResponse.json(
        { error: "This marks challenge is not awaiting approval." },
        { status: 409 },
      );
    }

    await prisma.submission.update({
      where: { id },
      data: {
        marksChallengeStatus: "APPROVED",
        marksChallengeApprovedAt: new Date(),
        marksChallengeResolvedAt: null,
        status: "GRADING",
        manualReviewStatus: "RETURNED_TO_MAKER",
        returnReason: "Marks challenge approved by admin. Regrade required.",
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RbacError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("MARKS_CHALLENGE_APPROVE_ERROR", error);
    return NextResponse.json({ error: "Failed to approve marks challenge." }, { status: 500 });
  }
}
