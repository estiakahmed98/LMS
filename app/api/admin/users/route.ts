import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  createUser,
  listUsers,
  normalizeUserCreatePayload,
} from "@/lib/admin-user-server";
import { getActorId } from "@/lib/audit";
import type { UserRoleValue } from "@/lib/admin-user-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as UserRoleValue | null;
  const courseId = searchParams.get("courseId");
  const users = await listUsers(role ?? undefined, courseId ?? undefined);
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  try {
    const payload = normalizeUserCreatePayload(await request.json());
    const actorId = await getActorId();
    const user = await createUser(payload, actorId);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 },
    );
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
