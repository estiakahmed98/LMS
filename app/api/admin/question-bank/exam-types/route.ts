import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { createExamType, listExamTypes } from "@/lib/question-bank-server";
export async function GET() { return NextResponse.json({ examTypes: await listExamTypes() }); }
export async function POST(request: Request) {
  try { return NextResponse.json({ examType: await createExamType(await request.json(), await getActorId()) }, { status: 201 }); }
  catch (error) { return handleQuestionBankApiError(error); }
}
