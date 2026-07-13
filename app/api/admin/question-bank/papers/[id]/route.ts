import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import {
  deleteQuestionPaper,
  getQuestionPaperById,
  normalizeQuestionPaperPayload,
  updateQuestionPaper,
} from "@/lib/question-bank-server";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const paper = await getQuestionPaperById(id);
  return paper
    ? NextResponse.json({ paper })
    : NextResponse.json({ error: "Question paper not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: Context) {
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
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    await deleteQuestionPaper(id, await getActorId());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
}
