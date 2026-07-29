import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  listSubmissionInbox,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";

const listSubmissionsHandler = async () => {
  try {
    const submissions = await listSubmissionInbox();
    return NextResponse.json({ submissions });
  } catch (error) {
    return handleSubmissionError(error);
  }
};

export const GET = withPermission(
  PermissionModule.SUBMISSIONS,
  "view",
  listSubmissionsHandler,
);

function handleSubmissionError(error: unknown) {
  if (error instanceof SubmissionGradingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("SUBMISSIONS_INBOX_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load submissions." },
    { status: 500 },
  );
}
