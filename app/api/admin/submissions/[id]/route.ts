import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  getSubmissionInboxDetail,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";

const getSubmissionHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const submission = await getSubmissionInboxDetail(id);
    return NextResponse.json({ submission });
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
