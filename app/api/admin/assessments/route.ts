import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  createAssessment,
  listAssessments,
  normalizeAssessmentPayload,
} from "@/lib/admin-assessment-server";
import type { AssessmentTypeValue } from "@/lib/admin-assessment-types";
import { getActorId } from "@/lib/audit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId") ?? undefined;
  const type = (searchParams.get("type") as AssessmentTypeValue | null) ?? undefined;

  const assessments = await listAssessments(courseId, type ?? undefined);
  return NextResponse.json({ assessments });
}

export async function POST(request: Request) {
  try {
    const payload = normalizeAssessmentPayload(await request.json());
    const actorId = await getActorId();
    const assessment = await createAssessment(payload, actorId);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Selected course does not exist." }, { status: 409 });
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
