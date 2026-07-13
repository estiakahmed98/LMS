import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { createInstitution, listInstitutions } from "@/lib/question-bank-server";

export async function GET() { return NextResponse.json({ institutions: await listInstitutions() }); }
export async function POST(request: Request) {
  try {
    const institution = await createInstitution(await request.json(), await getActorId());
    return NextResponse.json({ institution }, { status: 201 });
  } catch (error) { return handleQuestionBankApiError(error); }
}
