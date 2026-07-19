import { NextResponse } from "next/server";
import { requireLearnerAccount, submitLearnerAssessment } from "@/lib/learner-assessment-server";
import type { LearnerAssessmentSubmissionPayload } from "@/lib/learner-assessment-types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const learner = await requireLearnerAccount("create");
    const body = (await request.json()) as LearnerAssessmentSubmissionPayload;
    const payload = await submitLearnerAssessment(learner.id, assessmentId, body);
    return NextResponse.json(payload);
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof Error && "status" in error) {
    const learnerError = error as Error & { status: number };
    return NextResponse.json({ error: learnerError.message }, { status: learnerError.status });
  }

  console.error("LEARNER_ASSESSMENT_SUBMIT_ERROR", error);
  return NextResponse.json({ error: "Failed to submit assessment." }, { status: 500 });
}
