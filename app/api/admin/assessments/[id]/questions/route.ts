import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { createQuestion, normalizeQuestionPayload } from "@/lib/admin-assessment-server";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const createQuestionHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const payload = normalizeQuestionPayload(await request.json());
    const actorId = await getActorId();
    const assessment = await createQuestion(id, payload, actorId);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = withPermission(
  PermissionModule.ASSESSMENTS,
  "edit",
  createQuestionHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025" || error.code === "P2003") {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
