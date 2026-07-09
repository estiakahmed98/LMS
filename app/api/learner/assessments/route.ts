import { NextResponse } from "next/server";
import { getLearnerAssessmentList, requireLearnerAccount } from "@/lib/learner-assessment-server";

export async function GET() {
  try {
    const learner = await requireLearnerAccount();
    const payload = await getLearnerAssessmentList(learner.id);
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

  console.error("LEARNER_ASSESSMENTS_ERROR", error);
  return NextResponse.json({ error: "Failed to load assessments." }, { status: 500 });
}
