import { NextResponse } from "next/server";
import {
  getLearnerLiveClasses,
  LearnerLiveError,
  requireLearner,
} from "@/lib/learner-live-server";

export async function GET() {
  try {
    const learner = await requireLearner();
    const payload = await getLearnerLiveClasses(learner.id);
    return NextResponse.json(payload);
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof LearnerLiveError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LEARNER_LIVE_CLASSES_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load live classes." },
    { status: 500 },
  );
}
