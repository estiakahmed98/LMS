import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import {
  createQuestionPaper,
  listQuestionPapers,
  normalizeQuestionPaperPayload,
} from "@/lib/question-bank-server";

export async function GET() {
  try {
    const papers = await listQuestionPapers();
    return NextResponse.json({ papers });
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const paper = await createQuestionPaper(
      normalizeQuestionPaperPayload(await request.json()),
      await getActorId(),
    );
    return NextResponse.json({ paper }, { status: 201 });
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
}
