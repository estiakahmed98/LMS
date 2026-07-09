import { NextResponse } from "next/server";
import { getLearnerAssessmentDetail, requireLearnerAccount } from "@/lib/learner-assessment-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const learner = await requireLearnerAccount();
    const payload = await getLearnerAssessmentDetail(learner.id, assessmentId);
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

  console.error("LEARNER_ASSESSMENT_DETAIL_ERROR", error);
  return NextResponse.json({ error: "Failed to load assessment." }, { status: 500 });
}
