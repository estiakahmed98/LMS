import { NextRequest, NextResponse } from "next/server";
import { requireLearnerAccount } from "@/lib/learner-assessment-server";
import { getLearnerAssessmentResults, getLearnerResultFilterOptions } from "@/lib/result-list-server";
import { parseResultFilters } from "@/lib/result-list";
import { unstable_cache } from "next/cache";

const getCachedResults = unstable_cache(
  getLearnerAssessmentResults,
  ["learner-results-v1"],
  { revalidate: 60, tags: ["learner-data", "learner-results"] },
);
const getCachedResultOptions = unstable_cache(
  getLearnerResultFilterOptions,
  ["learner-result-options-v1"],
  { revalidate: 300, tags: ["learner-data", "learner-results"] },
);

export async function GET(request: NextRequest) {
  try {
    const learner = await requireLearnerAccount();
    const params = request.nextUrl.searchParams;
    const headers = { "Cache-Control": "private, no-store" };
    if (params.get("options") === "1") return NextResponse.json(await getCachedResultOptions(learner.id), { headers });
    let filters;
    try { filters = parseResultFilters(params); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400, headers }); }
    return NextResponse.json(await getCachedResults(learner.id, filters), { headers });
  } catch (error) {
    if (error instanceof Error && "status" in error) return NextResponse.json({ error: error.message }, { status: (error as Error & { status: number }).status });
    console.error("LEARNER_RESULTS_ERROR", error);
    return NextResponse.json({ error: "Failed to load results." }, { status: 500 });
  }
}
