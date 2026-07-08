import {
  assignUserToRole,
  parseRoleParam,
} from "@/lib/admin-role-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ role: string }> },
) {
  try {
    const { role } = await params;
    const roleValue = parseRoleParam(role);
    const body = (await request.json()) as { userId?: string };
    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "User is required." }, { status: 400 });
    }
    const actorId = await getActorId();
    const detail = await assignUserToRole(body.userId.trim(), roleValue, actorId);
    return NextResponse.json({ role: detail }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
