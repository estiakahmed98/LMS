import { NextResponse } from "next/server";
import {
  listInstructorRecordingFacets,
  listInstructorRecordings,
} from "@/lib/instructor-recording-server";
import { InstructorAuthError, requireInstructor } from "@/lib/instructor-server";
import type { AdminRecordingListFilters } from "@/lib/admin-recording-types";

export async function GET(request: Request) {
  try {
    const instructor = await requireInstructor();
    const params = new URL(request.url).searchParams;
    const int = (key: string) => {
      const value = params.get(key);
      return value ? Number(value) : undefined;
    };

    const filters: AdminRecordingListFilters = {
      search: params.get("search") || undefined,
      batchName: params.get("batchName") || undefined,
      subjectName: params.get("subjectName") || undefined,
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      page: int("page"),
      pageSize: int("pageSize"),
    };

    const [result, facets] = await Promise.all([
      listInstructorRecordings(instructor.id, filters),
      params.get("includeFacets") === "true"
        ? listInstructorRecordingFacets(instructor.id)
        : Promise.resolve(null),
    ]);

    return NextResponse.json(facets ? { ...result, facets } : result);
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("INSTRUCTOR_RECORDINGS_ERROR", error);
    return NextResponse.json({ error: "Failed to load recordings." }, { status: 500 });
  }
}
