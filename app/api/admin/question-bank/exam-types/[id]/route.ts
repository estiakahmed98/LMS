import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { deleteExamType, updateExamType } from "@/lib/question-bank-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
type Context = { params: Promise<{ id: string }> };
const updateOne = async (request: Request, { params }: Context) => {
  try { const { id } = await params; return NextResponse.json({ examType: await updateExamType(id, await request.json(), await getActorId()) }); }
  catch (error) { return handleQuestionBankApiError(error); }
};
const deleteOne = async (_request: Request, { params }: Context) => {
  try { const { id } = await params; await deleteExamType(id, await getActorId()); return NextResponse.json({ ok: true }); }
  catch (error) { return handleQuestionBankApiError(error); }
};
export const PATCH = withPermission(PermissionModule.QUESTION_BANK, "edit", updateOne);
export const DELETE = withPermission(PermissionModule.QUESTION_BANK, "delete", deleteOne);
