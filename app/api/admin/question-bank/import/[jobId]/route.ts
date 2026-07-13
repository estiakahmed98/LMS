import { NextResponse } from "next/server";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { getImportJobById } from "@/lib/question-bank-server";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params; const job = await getImportJobById(jobId);
    return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Import job not found." }, { status: 404 });
  } catch (error) { return handleQuestionBankApiError(error); }
}
