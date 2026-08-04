import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  getSubmissionInboxLearnerHistory,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";

const getSubmissionHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const history = await getSubmissionInboxLearnerHistory(id);
    return NextResponse.json(history);
  } catch (error) {
    return handleSubmissionError(error);
  }
};

export const GET = withPermission(
  PermissionModule.SUBMISSIONS,
  "view",
  getSubmissionHandler,
);

function handleSubmissionError(error: unknown) {
  if (error instanceof SubmissionGradingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("SUBMISSION_DETAIL_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load submission." },
    { status: 500 },
  );
}
