import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import {
  createQuestionPaper,
  listQuestionPapers,
  normalizeQuestionPaperPayload,
} from "@/lib/question-bank-server";
import type { QuestionPaperListFilters } from "@/lib/question-bank-types";
import type { QuestionTypeValue } from "@/lib/admin-assessment-types";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listPapers = async (request: Request) => {
  try {
    const params = new URL(request.url).searchParams;
    const int = (key: string) => {
      const value = params.get(key);
      return value ? Number(value) : undefined;
    };

    const filters: QuestionPaperListFilters = {
      search: params.get("search") || undefined,
      courseId: params.get("courseId") || undefined,
      moduleId: params.get("moduleId") || undefined,
      batchId: params.get("batchId") || undefined,
      examTypeId: params.get("examTypeId") || undefined,
      institutionId: params.get("institutionId") || undefined,
      examYear: int("examYear"),
      type: (params.get("type") || undefined) as QuestionTypeValue | undefined,
      page: int("page"),
      pageSize: int("pageSize"),
    };

    const result = await listQuestionPapers(filters);
    return NextResponse.json(result);
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
};

const createPaper = async (request: Request) => {
  try {
    const paper = await createQuestionPaper(
      normalizeQuestionPaperPayload(await request.json()),
      await getActorId(),
    );
    return NextResponse.json({ paper }, { status: 201 });
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
};

export const GET = withPermission(PermissionModule.QUESTION_BANK, "view", listPapers);
export const POST = withPermission(PermissionModule.QUESTION_BANK, "create", createPaper);
