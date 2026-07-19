import { NextResponse } from "next/server";
import { getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { confirmImportDraft, getImportJobById, markImportJobStatus, rejectImportDraft, updateImportDraft } from "@/lib/question-bank-server";
import type { QuestionImportDraftConfirmPayload, QuestionImportDraftUpdatePayload } from "@/lib/question-bank-types";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

type Context = { params: Promise<{ jobId: string; draftId: string }> };
type Body =
  | { action: "update"; payload: QuestionImportDraftUpdatePayload }
  | { action: "confirm"; payload: QuestionImportDraftConfirmPayload }
  | { action: "reject" };

async function completeJobIfReviewed(jobId: string) {
  const job = await getImportJobById(jobId);
  if (job?.drafts.length && job.drafts.every((draft) => draft.status === "CONFIRMED" || draft.status === "REJECTED")) {
    await markImportJobStatus(jobId, "COMPLETED");
  }
}

// PATCH body is discriminated by action: update, confirm, or reject.
const reviewDraft = async (request: Request, { params }: Context) => {
  try {
    const { jobId, draftId } = await params;
    const job = await getImportJobById(jobId);
    if (!job) return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    if (!job.drafts.some((draft) => draft.id === draftId)) return NextResponse.json({ error: "Import draft not found." }, { status: 404 });
    const body = await request.json() as Body;
    const actorId = await getActorId();
    if (body.action === "update") return NextResponse.json({ draft: await updateImportDraft(draftId, body.payload, actorId) });
    if (body.action === "confirm") {
      const result = await confirmImportDraft(draftId, body.payload, actorId);
      await completeJobIfReviewed(jobId);
      return NextResponse.json(result);
    }
    if (body.action === "reject") {
      const draft = await rejectImportDraft(draftId, actorId);
      await completeJobIfReviewed(jobId);
      return NextResponse.json({ draft });
    }
    return NextResponse.json({ error: "Invalid draft action." }, { status: 400 });
  } catch (error) { return handleQuestionBankApiError(error); }
};

export const PATCH = withPermission(
  PermissionModule.QUESTION_BANK,
  "edit",
  reviewDraft,
);
