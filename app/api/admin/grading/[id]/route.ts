import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  getGradingSubmissionDetail,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";

const getSubmissionHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const submission = await getGradingSubmissionDetail(id);
    return NextResponse.json({ submission });
  } catch (error) {
    return handleGradingError(error);
  }
};

export const GET = withPermission(
  PermissionModule.GRADING,
  "view",
  getSubmissionHandler,
);

function handleGradingError(error: unknown) {
  if (error instanceof SubmissionGradingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("GRADING_SUBMISSION_DETAIL_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load grading submission." },
    { status: 500 },
  );
}
