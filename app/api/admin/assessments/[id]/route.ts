import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  deleteAssessment,
  getAssessmentById,
  normalizeAssessmentPayload,
  updateAssessment,
} from "@/lib/admin-assessment-server";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const getAssessmentHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const assessment = await getAssessmentById(id);
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }
  return NextResponse.json({ assessment });
};

const updateAssessmentHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const payload = normalizeAssessmentPayload(await request.json());
    const actorId = await getActorId();
    const assessment = await updateAssessment(id, payload, actorId);
    return NextResponse.json({ assessment });
  } catch (error) {
    return handleApiError(error);
  }
};

const deleteAssessmentHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const actorId = await getActorId();
    await deleteAssessment(id, actorId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.ASSESSMENTS,
  "view",
  getAssessmentHandler,
);
export const PATCH = withPermission(
  PermissionModule.ASSESSMENTS,
  "edit",
  updateAssessmentHandler,
);
export const DELETE = withPermission(
  PermissionModule.ASSESSMENTS,
  "delete",
  deleteAssessmentHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Selected course does not exist." }, { status: 409 });
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
