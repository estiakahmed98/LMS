import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { createBatch, listBatches } from "@/lib/question-bank-server";

export async function GET() { return NextResponse.json({ batches: await listBatches() }); }
export async function POST(request: Request) {
  try { return NextResponse.json({ batch: await createBatch(await request.json(), await getActorId()) }, { status: 201 }); }
  catch (error) { return handleQuestionBankApiError(error); }
}
