import {
  deleteRecording,
  getRecording,
  normalizeRecordingPayload,
  updateRecording,
} from "@/lib/admin-recording-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recording = await getRecording(id);

  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  return NextResponse.json({ recording });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await prisma.liveClassSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    }

    const payload = normalizeRecordingPayload(await request.json());
    const recording = await updateRecording(id, payload);
    return NextResponse.json({ recording });
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
    await deleteRecording(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Selected class does not exist." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
