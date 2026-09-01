import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  createAssessment,
  getAssessmentStats,
  listAssessments,
  normalizeAssessmentPayload,
} from "@/lib/admin-assessment-server";
import type {
  AdminAssessmentListFilters,
  AssessmentLifecycleStatus,
  AssessmentTypeValue,
} from "@/lib/admin-assessment-types";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

const lifecycleStatusValues: AssessmentLifecycleStatus[] = [
  "DRAFT",
  "UPCOMING",
  "RUNNING",
  "COMPLETED",
];

const getAssessments = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const int = (key: string) => {
    const value = params.get(key);
    return value ? Number(value) : undefined;
  };
  const status = params.get("status");
  const includeStats = params.get("includeStats") === "true";

  const filters: AdminAssessmentListFilters = {
    search: params.get("search") || undefined,
    courseId: params.get("courseId") || undefined,
    type: (params.get("type") as AssessmentTypeValue | null) ?? undefined,
    status:
      status && lifecycleStatusValues.includes(status as AssessmentLifecycleStatus)
        ? (status as AssessmentLifecycleStatus)
        : undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    page: int("page"),
    pageSize: int("pageSize"),
  };

  const [result, stats] = await Promise.all([
    listAssessments(filters),
    includeStats
      ? getAssessmentStats({
          search: filters.search,
          courseId: filters.courseId,
          type: filters.type,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json(stats ? { ...result, stats } : result);
};

const createAssessmentHandler = async (request: Request) => {
  try {
    const payload = normalizeAssessmentPayload(await request.json());
    const actorId = await getActorId();
    const assessment = await createAssessment(payload, actorId);
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(
  PermissionModule.ASSESSMENTS,
  "view",
  getAssessments,
);
export const POST = withPermission(
  PermissionModule.ASSESSMENTS,
  "create",
  createAssessmentHandler,
);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Selected course does not exist." }, { status: 409 });
    }
  }
  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
