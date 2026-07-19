import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { enrollUserInCourse } from "@/lib/admin-user-server";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const enrollUserHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = (await request.json()) as { courseId?: string };
    const courseId = body.courseId?.trim();
    if (!courseId) {
      return NextResponse.json({ error: "Course is required." }, { status: 400 });
    }

    const actorId = await getActorId();
    const user = await enrollUserInCourse(id, courseId, actorId);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withPermission(
  PermissionModule.STUDENTS,
  "edit",
  enrollUserHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "This student is already enrolled in that course." },
        { status: 409 },
      );
    }
    if (error.code === "P2003" || error.code === "P2025") {
      return NextResponse.json(
        { error: "User or course does not exist." },
        { status: 409 },
      );
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
