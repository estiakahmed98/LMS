import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import {
  createQuestionPaper,
  listQuestionPapers,
  normalizeQuestionPaperPayload,
} from "@/lib/question-bank-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listPapers = async () => {
  try {
    const papers = await listQuestionPapers();
    return NextResponse.json({ papers });
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
