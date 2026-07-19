import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { bulkUpdateQuestionBankStatus } from "@/lib/question-bank-server";
import type { QuestionBankStatusValue } from "@/lib/question-bank-types";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const statusValues: QuestionBankStatusValue[] = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED"];

const bulkUpdateStatusHandler = async (request: Request) => {
  try {
    const body = (await request.json()) as { ids?: unknown; status?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.map((id) => String(id)) : [];
    const status = String(body.status ?? "").toUpperCase();
    if (ids.length === 0) throw new Error("No questions selected.");
    if (!statusValues.includes(status as QuestionBankStatusValue)) {
      throw new Error("Invalid status.");
    }
    const result = await bulkUpdateQuestionBankStatus(
      ids,
      status as QuestionBankStatusValue,
      await getActorId(),
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleQuestionBankApiError(error);
  }
};

export const PATCH = withPermission(
  PermissionModule.QUESTION_BANK,
  "edit",
  bulkUpdateStatusHandler,
);
