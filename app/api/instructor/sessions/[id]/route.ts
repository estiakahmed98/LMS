import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  cancelInstructorSession,
  endInstructorSession,
  requireInstructor,
  startInstructorSession,
  updateInstructorSessionSchedule,
} from "@/lib/instructor-server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor({
      module: "COURSES",
      action: "edit",
    });
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const instructor = await requireInstructor({
      module: "COURSES",
      action: "edit",
    });
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };
    const action = body.action?.trim();

    if (!action) {
      return NextResponse.json({ error: "action is required." }, { status: 400 });
    }

    let session;
    switch (action) {
      case "start":
        session = await startInstructorSession(instructor.id, id);
        break;
      case "cancel":
        session = await cancelInstructorSession(instructor.id, id);
        break;
      case "end":
        session = await endInstructorSession(instructor.id, id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return handleInstructorError(error);
  }
}

function handleInstructorError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("INSTRUCTOR_SESSION_ACTION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to update session." },
    { status: 500 },
  );
}
