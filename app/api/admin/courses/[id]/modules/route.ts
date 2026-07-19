import {
  createModule,
  getCourse,
  normalizeModulePayload,
} from "@/lib/admin-course-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getModulesHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const course = await getCourse(id);

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ modules: course.modules });
};

const createModuleHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const course = await getCourse(id);
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const payload = normalizeModulePayload(await request.json());
    const actorId = await getActorId();
    const module = await createModule(id, payload, actorId);
    return NextResponse.json({ module }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.COURSES,
  "view",
  getModulesHandler,
);
export const POST = withPermission(
  PermissionModule.COURSES,
  "edit",
  createModuleHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Module order must be unique inside the course." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
