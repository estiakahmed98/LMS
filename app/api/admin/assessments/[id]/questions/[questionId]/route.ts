import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  deleteQuestion,
  normalizeQuestionPayload,
  updateQuestion,
} from "@/lib/admin-assessment-server";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const updateQuestionHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) => {
  try {
    const { id, questionId } = await params;
    const payload = normalizeQuestionPayload(await request.json());
    const actorId = await getActorId();
    const assessment = await updateQuestion(id, questionId, payload, actorId);
    return NextResponse.json({ assessment });
  } catch (error) {
    return handleApiError(error);
  }
};

const deleteQuestionHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string; questionId: string }> },
) => {
  try {
    const { id, questionId } = await params;
    const actorId = await getActorId();
    const assessment = await deleteQuestion(id, questionId, actorId);
    return NextResponse.json({ assessment });
  } catch (error) {
    return handleApiError(error);
  }
};

export const PATCH = withPermission(
  PermissionModule.ASSESSMENTS,
  "edit",
  updateQuestionHandler,
);
export const DELETE = withPermission(
  PermissionModule.ASSESSMENTS,
  "delete",
  deleteQuestionHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
