import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  getSubmissionInboxStats,
  listSubmissionInbox,
  listSubmissionInboxCourseOptions,
  SubmissionGradingError,
} from "@/lib/submission-grading-server";
import type {
  ManualReviewStatusValue,
  SubmissionInboxFilters,
} from "@/lib/submission-grading-types";

const manualReviewStatusValues: ManualReviewStatusValue[] = [
  "NOT_REQUIRED",
  "PENDING_MAKER",
  "MAKER_DRAFT",
  "PENDING_CHECKER",
  "RETURNED_TO_MAKER",
  "FINALIZED",
];

const listSubmissionsHandler = async (request: Request) => {
  try {
    const params = new URL(request.url).searchParams;
    const int = (key: string) => {
      const value = params.get(key);
      return value ? Number(value) : undefined;
    };
    const status = params.get("status");
    const includeStats = params.get("includeStats") === "true";
    const includeCourseOptions = params.get("includeCourseOptions") === "true";

    const filters: SubmissionInboxFilters = {
      search: params.get("search") || undefined,
      courseId: params.get("courseId") || undefined,
      status:
        status && manualReviewStatusValues.includes(status as ManualReviewStatusValue)
          ? (status as ManualReviewStatusValue)
          : undefined,
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      page: int("page"),
      pageSize: int("pageSize"),
    };

    const [result, stats, courseOptions] = await Promise.all([
      listSubmissionInbox(filters),
      includeStats
        ? getSubmissionInboxStats({
            search: filters.search,
            courseId: filters.courseId,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          })
        : Promise.resolve(null),
      includeCourseOptions ? listSubmissionInboxCourseOptions() : Promise.resolve(null),
    ]);

    return NextResponse.json({
      ...result,
      ...(stats ? { stats } : {}),
      ...(courseOptions ? { courses: courseOptions } : {}),
    });
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
