import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  requireInstructor,
  updateInstructorSessionSchedule,
} from "@/lib/instructor-server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor();
    const { id } = await context.params;
    const body = (await request.json()) as {
      scheduledStart?: string;
      scheduledEnd?: string;
    };

    if (!body.scheduledStart || !body.scheduledEnd) {
      return NextResponse.json(
        { error: "scheduledStart and scheduledEnd are required." },
        { status: 400 },
      );
    }

    const session = await updateInstructorSessionSchedule(instructor.id, id, {
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd,
    });
    return NextResponse.json({ session });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_UPDATE_SESSION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to update session." },
    { status: 500 },
  );
}
