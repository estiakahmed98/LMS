import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  applyCheckerReview,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";
import type { CheckerReviewPayload } from "@/lib/submission-grading-types";

const checkerActionHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const payload = (await request.json()) as CheckerReviewPayload;
    const submission = await applyCheckerReview(id, payload);
    return NextResponse.json({ submission });
  } catch (error) {
    return handleGradingError(error);
  }
};

export const POST = withPermission(
  PermissionModule.GRADING,
  "edit",
  checkerActionHandler,
);

function handleGradingError(error: unknown) {
  if (error instanceof SubmissionGradingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("GRADING_CHECKER_ACTION_ERROR", error);
  return NextResponse.json(
    { error: "Failed to apply checker review." },
    { status: 500 },
  );
}
