import { NextResponse } from "next/server";
import {
  getInstructorParticipantsUncached,
  InstructorAuthError,
  requireInstructor,
} from "@/lib/instructor-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor({
      module: "COURSES",
      action: "view",
    });
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page"));

    const payload = await getInstructorParticipantsUncached(instructor.id, {
      sessionId: id,
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: 50,
      student: searchParams.get("student") ?? undefined,
      includeFilters: false,
      includeAllStatuses: true,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("INSTRUCTOR_CLASS_PARTICIPANTS_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load class details." },
      { status: 500 },
    );
  }
}
