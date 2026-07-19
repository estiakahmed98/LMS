import {
  createCourse,
  listCourses,
  normalizeCoursePayload,
} from "@/lib/admin-course-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getCourses = async () => {
  const courses = await listCourses();
  return NextResponse.json({ courses });
};

const createCourseHandler = async (request: Request) => {
  try {
    const payload = normalizeCoursePayload(await request.json());
    const actorId = await getActorId();
    const course = await createCourse(payload, actorId);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.COURSES,
  "view",
  getCourses,
);
export const POST = withPermission(
  PermissionModule.COURSES,
  "create",
  createCourseHandler,
);

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
