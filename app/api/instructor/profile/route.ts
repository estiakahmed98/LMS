import { NextResponse } from "next/server";
import {
  getInstructorProfile,
  InstructorAuthError,
  requireInstructor,
  updateInstructorProfile,
} from "@/lib/instructor-server";

export async function GET() {
  try {
    const instructor = await requireInstructor({
      module: "SETTINGS",
      action: "view",
    });
    const profile = await getInstructorProfile(instructor.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const instructor = await requireInstructor({
      module: "SETTINGS",
      action: "edit",
    });
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      photoUrl?: string | null;
      currentPassword?: string;
      newPassword?: string;
    };
    const profile = await updateInstructorProfile(instructor.id, body);
    return NextResponse.json({ profile });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof InstructorAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("INSTRUCTOR_PROFILE_ERROR", error);
  return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
}
