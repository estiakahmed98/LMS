import {
  createCourse,
  listCourses,
  normalizeCoursePayload,
} from "@/lib/admin-course-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const courses = await listCourses();
  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  try {
    const payload = normalizeCoursePayload(await request.json());
    const actorId = await getActorId();
    const course = await createCourse(payload, actorId);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A course with that unique value already exists." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
