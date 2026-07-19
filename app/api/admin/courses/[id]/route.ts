import {
  deleteCourse,
  getCourse,
  normalizeCoursePayload,
  updateCourse,
} from "@/lib/admin-course-server";
import { getActorId } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getCourseHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const course = await getCourse(id);

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ course });
};

const updateCourseHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const existing = await prisma.course.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const payload = normalizeCoursePayload(await request.json());
    const actorId = await getActorId();
    const course = await updateCourse(id, payload, actorId);
    return NextResponse.json({ course });
  } catch (error) {
    return handleApiError(error);
  }
};

const deleteCourseHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const actorId = await getActorId();
    await deleteCourse(id, actorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.COURSES,
  "view",
  getCourseHandler,
);
export const PATCH = withPermission(
  PermissionModule.COURSES,
  "edit",
  updateCourseHandler,
);
export const DELETE = withPermission(
  PermissionModule.COURSES,
  "delete",
  deleteCourseHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "This course cannot be deleted because related records still depend on it.",
        },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
