import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import {
  deleteQuestionPaper,
  getQuestionPaperById,
  normalizeQuestionPaperPayload,
  updateQuestionPaper,
} from "@/lib/question-bank-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

type Context = { params: Promise<{ id: string }> };

const getPaper = async (_request: Request, { params }: Context) => {
  const { id } = await params;
  const paper = await getQuestionPaperById(id);
  return paper
    ? NextResponse.json({ paper })
    : NextResponse.json({ error: "Question paper not found." }, { status: 404 });
};

const updatePaper = async (request: Request, { params }: Context) => {
  try {
    const { id } = await params;
    const paper = await updateQuestionPaper(
      id,
      normalizeQuestionPaperPayload(await request.json()),
      await getActorId(),
    );
    return NextResponse.json({ paper });
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
};

const deletePaper = async (_request: Request, { params }: Context) => {
  try {
    const { id } = await params;
    await deleteQuestionPaper(id, await getActorId());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
};

export const GET = withPermission(PermissionModule.QUESTION_BANK, "view", getPaper);
export const PATCH = withPermission(PermissionModule.QUESTION_BANK, "edit", updatePaper);
export const DELETE = withPermission(PermissionModule.QUESTION_BANK, "delete", deletePaper);
