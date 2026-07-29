import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  listGradingQueue,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";
import type { GradingQueueFilter } from "@/lib/submission-grading-types";

const listQueueHandler = async (request: Request) => {
  try {
    const queue =
      (new URL(request.url).searchParams.get("queue") as GradingQueueFilter | null) ??
      "maker";
    const submissions = await listGradingQueue(queue);
    return NextResponse.json({ submissions });
  } catch (error) {
    return handleGradingError(error);
  }
};

export const GET = withPermission(
  PermissionModule.GRADING,
  "view",
  listQueueHandler,
);

function handleGradingError(error: unknown) {
  if (error instanceof SubmissionGradingError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("GRADING_QUEUE_ERROR", error);
  return NextResponse.json(
    { error: "Failed to load grading queue." },
    { status: 500 },
  );
}
