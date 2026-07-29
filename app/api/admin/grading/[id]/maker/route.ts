import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  saveMakerReview,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";
import type { MakerReviewPayload } from "@/lib/submission-grading-types";

const makerActionHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const payload = (await request.json()) as MakerReviewPayload;
    const submission = await saveMakerReview(id, payload);
    return NextResponse.json({ submission });
  } catch (error) {
    return handleGradingError(error);
  }
};

export const POST = withPermission(
  PermissionModule.GRADING,
  "edit",
  makerActionHandler,
);

function handleGradingError(error: unknown) {
  if (error instanceof SubmissionGradingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("GRADING_MAKER_ACTION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to save maker review." },
    { status: 500 },
  );
}
