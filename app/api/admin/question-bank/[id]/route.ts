import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { deleteQuestionBankItem, getQuestionBankItemById, normalizeQuestionBankPayload, updateQuestionBankItem } from "@/lib/question-bank-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params; const item = await getQuestionBankItemById(id);
  return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Question not found." }, { status: 404 });
}
const updateQuestionHandler = async (request: Request, { params }: Context) => {
  try { const { id } = await params; const item = await updateQuestionBankItem(id, normalizeQuestionBankPayload(await request.json()), await getActorId()); return NextResponse.json({ item }); }
  catch (error) { return handleQuestionBankApiError(error); }
};
const deleteQuestionHandler = async (_request: Request, { params }: Context) => {
  try { const { id } = await params; await deleteQuestionBankItem(id, await getActorId()); return NextResponse.json({ ok: true }); }
  catch (error) { return handleQuestionBankApiError(error); }
};

export const PATCH = withPermission(
  PermissionModule.QUESTION_BANK,
  "edit",
  updateQuestionHandler,
);
export const DELETE = withPermission(
  PermissionModule.QUESTION_BANK,
  "delete",
  deleteQuestionHandler,
);
