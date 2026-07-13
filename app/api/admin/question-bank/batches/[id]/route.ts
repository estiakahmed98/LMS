import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { deleteBatch, updateBatch } from "@/lib/question-bank-server";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try { const { id } = await params; return NextResponse.json({ batch: await updateBatch(id, await request.json(), await getActorId()) }); }
  catch (error) { return handleQuestionBankApiError(error); }
}
export async function DELETE(_request: Request, { params }: Context) {
  try { const { id } = await params; await deleteBatch(id, await getActorId()); return NextResponse.json({ ok: true }); }
  catch (error) { return handleQuestionBankApiError(error); }
}
