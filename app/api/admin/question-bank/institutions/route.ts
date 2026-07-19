import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { createInstitution, listInstitutions } from "@/lib/question-bank-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const listAll = async () => NextResponse.json({ institutions: await listInstitutions() });
const createOne = async (request: Request) => {
  try {
    const institution = await createInstitution(await request.json(), await getActorId());
    return NextResponse.json({ institution }, { status: 201 });
  } catch (error) { return handleQuestionBankApiError(error); }
};
export const GET = withPermission(PermissionModule.QUESTION_BANK, "view", listAll);
export const POST = withPermission(PermissionModule.QUESTION_BANK, "create", createOne);
