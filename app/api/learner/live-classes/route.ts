import { NextResponse } from "next/server";
import {
  getLearnerLiveClasses,
  LearnerLiveError,
  requireLearner,
} from "@/lib/learner-live-server";

export async function GET(request: Request) {
  try {
    const learner = await requireLearner();
    const { searchParams } = new URL(request.url);
    const payload = await getLearnerLiveClasses(learner.id, {
      scope: searchParams.get("scope") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      pageSize: Number(searchParams.get("pageSize") || 0) || undefined,
      search: searchParams.get("search") ?? undefined,
      courseId: searchParams.get("courseId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
    });
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
