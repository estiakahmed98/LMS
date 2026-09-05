import { NextRequest, NextResponse } from "next/server";
import { requireLearnerAccount } from "@/lib/learner-assessment-server";
import { getLearnerAssessmentList, getLearnerAssessmentFilterOptions } from "@/lib/assessment-list-server";
import { parseAssessmentFilters } from "@/lib/assessment-list";

export async function GET(request: NextRequest) {
  try {
    const learner = await requireLearnerAccount();
    const params = request.nextUrl.searchParams;
    if (params.get("options") === "1") return NextResponse.json(await getLearnerAssessmentFilterOptions(learner.id), { headers: { "Cache-Control": "private, no-store" } });
    let filters;
    try { filters = parseAssessmentFilters(params); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    return NextResponse.json(await getLearnerAssessmentList(learner.id, filters), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && "status" in error) return NextResponse.json({ error: error.message }, { status: (error as Error & { status: number }).status });
    console.error("LEARNER_ASSESSMENTS_ERROR", error);
    return NextResponse.json({ error: "Failed to load assessments." }, { status: 500 });
  }
}
