import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import type { DifficultyValue, QuestionTypeValue } from "@/lib/admin-assessment-types";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { createQuestionBankItem, listQuestionBankItems, normalizeQuestionBankPayload } from "@/lib/question-bank-server";
import type { QuestionBankListFilters, QuestionBankStatusValue } from "@/lib/question-bank-types";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const int = (key: string) => { const value = params.get(key); return value ? Number(value) : undefined; };
    const filters: QuestionBankListFilters = {
      search: params.get("search") || undefined, courseId: params.get("courseId") || undefined,
      moduleId: params.get("moduleId") || undefined, batchId: params.get("batchId") || undefined,
      examTypeId: params.get("examTypeId") || undefined, institutionId: params.get("institutionId") || undefined,
      examYear: int("examYear"), page: int("page"), pageSize: int("pageSize"),
      type: (params.get("type") || undefined) as QuestionTypeValue | undefined,
      difficulty: (params.get("difficulty") || undefined) as DifficultyValue | undefined,
      status: (params.get("status") || undefined) as QuestionBankStatusValue | undefined,
      paperId: params.get("paperId") || undefined,
      unassignedOnly: params.get("unassignedOnly") === "true" || undefined,
    };
    return NextResponse.json(await listQuestionBankItems(filters));
  } catch (error) { return handleQuestionBankApiError(error); }
}
export async function POST(request: Request) {
  try {
    const item = await createQuestionBankItem(normalizeQuestionBankPayload(await request.json()), await getActorId());
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { return handleQuestionBankApiError(error); }
}
