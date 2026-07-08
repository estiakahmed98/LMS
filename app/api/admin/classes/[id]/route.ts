import {
  deleteClass,
  getClassDetail,
  normalizeClassPayload,
  updateClass,
} from "@/lib/admin-class-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const liveClass = await getClassDetail(id);

  if (!liveClass) {
    return NextResponse.json({ error: "Class not found." }, { status: 404 });
  }

  return NextResponse.json({ class: liveClass });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.liveClass.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }

    const payload = normalizeClassPayload(await request.json());
    const liveClass = await updateClass(id, payload);
    return NextResponse.json({ class: liveClass });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteClass(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Class not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "This class cannot be modified because related records still depend on it.",
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
