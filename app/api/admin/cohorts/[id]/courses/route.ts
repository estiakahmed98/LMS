import { NextResponse } from "next/server";
import {
  AdminCohortError,
  normalizeIdSelection,
  syncCohortCourses,
} from "@/lib/admin-cohort-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireActiveUser, withPermission } from "@/lib/rbac";

const putHandler = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const [{ id }, actor, input] = await Promise.all([
      params,
      requireActiveUser(),
      request.json(),
    ]);
    return NextResponse.json(
      await syncCohortCourses(id, normalizeIdSelection(input, "courseIds"), actor.id),
    );
  } catch (error) {
    if (error instanceof AdminCohortError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
};

export const PUT = withPermission(PermissionModule.COURSES, "edit", putHandler);
