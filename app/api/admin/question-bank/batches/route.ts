import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { createBatch, listBatches } from "@/lib/question-bank-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listAll = async () => NextResponse.json({ batches: await listBatches() });
const createOne = async (request: Request) => {
  try { return NextResponse.json({ batch: await createBatch(await request.json(), await getActorId()) }, { status: 201 }); }
  catch (error) { return handleQuestionBankApiError(error); }
};
export const GET = withPermission(PermissionModule.QUESTION_BANK, "view", listAll);
export const POST = withPermission(PermissionModule.QUESTION_BANK, "create", createOne);
