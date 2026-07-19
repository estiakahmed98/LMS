import {
  deleteRecording,
  getRecording,
  normalizeRecordingPayload,
  updateRecording,
} from "@/lib/admin-recording-server";
import { getActorId } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getOne = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const recording = await getRecording(id);

  if (!recording) {
    return NextResponse.json({ error: "Recording not found." }, { status: 404 });
  }

  return NextResponse.json({ recording });
};

const updateOne = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const existing = await prisma.liveClassSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    }

    const payload = normalizeRecordingPayload(await request.json());
    const actorId = await getActorId();
    const recording = await updateRecording(id, payload, actorId);
    return NextResponse.json({ recording });
  } catch (error) {
    return handleApiError(error);
  }
};

const deleteOne = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const actorId = await getActorId();
    await deleteRecording(id, actorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(PermissionModule.COURSES, "view", getOne);
export const PATCH = withPermission(PermissionModule.COURSES, "edit", updateOne);
export const DELETE = withPermission(PermissionModule.COURSES, "delete", deleteOne);

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
