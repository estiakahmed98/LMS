import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  getInstructorAttendanceSummary,
  getInstructorParticipants,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET(request: Request) {
  try {
    const instructor = await requireInstructor({
      module: "REPORTS",
      action: "view",
    });
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const numberParam = (key: string) => {
      const value = Number(searchParams.get(key));
      return Number.isInteger(value) && value > 0 ? value : undefined;
    };

    const payloadPromise = getInstructorParticipants(instructor.id, {
      sessionId,
      page: numberParam("page"),
      pageSize: numberParam("pageSize"),
      sessionPage: numberParam("sessionPage"),
      sessionPageSize: numberParam("sessionPageSize"),
      liveClassId: searchParams.get("liveClassId") ?? undefined,
      group: searchParams.get("group") ?? undefined,
      student: searchParams.get("student") ?? undefined,
      includeFilters: searchParams.get("includeFilters") !== "false",
    });
    if (searchParams.get("includeSummary") === "false") {
      return NextResponse.json(await payloadPromise);
    }
    const [payload, summary] = await Promise.all([
      payloadPromise,
      getInstructorAttendanceSummary(instructor.id),
    ]);
    return NextResponse.json({ ...payload, summary });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_PARTICIPANTS_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load participants." },
    { status: 500 },
  );
}
