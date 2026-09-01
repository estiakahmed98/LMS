import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  getGradingQueueCounts,
  listGradingQueue,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";
import type { GradingQueueFilter } from "@/lib/submission-grading-types";

const queueValues: GradingQueueFilter[] = ["maker", "checker", "returned", "finalized", "all"];

const listQueueHandler = async (request: Request) => {
  try {
    const params = new URL(request.url).searchParams;
    const int = (key: string) => {
      const value = params.get(key);
      return value ? Number(value) : undefined;
    };
    const queueParam = params.get("queue");
    const queue = queueValues.includes(queueParam as GradingQueueFilter)
      ? (queueParam as GradingQueueFilter)
      : "maker";
    const includeCounts = params.get("includeCounts") === "true";

    const [result, counts] = await Promise.all([
      listGradingQueue({ queue, page: int("page"), pageSize: int("pageSize") }),
      includeCounts ? getGradingQueueCounts() : Promise.resolve(null),
    ]);

    return NextResponse.json({ ...result, ...(counts ? { counts } : {}) });
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
