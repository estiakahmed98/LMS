import {
  createClass,
  listClasses,
  normalizeClassPayload,
} from "@/lib/admin-class-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getClassesHandler = async () => {
  const classes = await listClasses();
  return NextResponse.json({ classes });
};

const createClassHandler = async (request: Request) => {
  try {
    const payload = normalizeClassPayload(await request.json());
    const actorId = await getActorId();
    const liveClass = await createClass(payload, actorId);
    return NextResponse.json({ class: liveClass }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.COURSES,
  "view",
  getClassesHandler,
);
export const POST = withPermission(
  PermissionModule.COURSES,
  "create",
  createClassHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A class with that unique value already exists." },
        { status: 409 },
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Selected course or instructor does not exist." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
