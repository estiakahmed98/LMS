import { NextResponse } from "next/server";
import { LearnerAuthError } from "@/lib/learner-auth-server";
import { getLearnerProfile } from "@/lib/learner-profile-server";

export async function GET() {
  try {
    const profile = await getLearnerProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_PROFILE_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load learner profile." },
      { status: 500 },
    );
  }
}
