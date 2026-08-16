import { NextResponse } from "next/server";
import {
  AdminCohortError,
  getCohortWorkspace,
  normalizeCohortPayload,
  updateCohort,
} from "@/lib/admin-cohort-server";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireActiveUser, withPermission } from "@/lib/rbac";

type RouteContext = { params: Promise<{ id: string }> };

const getHandler = async (_request: Request, { params }: RouteContext) => {
  try {
    const { id } = await params;
    return NextResponse.json(await getCohortWorkspace(id));
  } catch (error) {
    return handleError(error);
  }
};

const patchHandler = async (request: Request, { params }: RouteContext) => {
  try {
    const [{ id }, actor, input] = await Promise.all([
      params,
      requireActiveUser(),
      request.json(),
    ]);
    const cohort = await updateCohort(id, normalizeCohortPayload(input), actor.id);
    return NextResponse.json({ cohort });
  } catch (error) {
    return handleError(error);
  }
};

const deleteHandler = async (_request: Request, { params }: RouteContext) => {
  try {
    const [{ id }, actor] = await Promise.all([params, requireActiveUser()]);
    const workspace = await getCohortWorkspace(id);
    const cohort = await updateCohort(
      id,
      { ...workspace.cohort, status: "ARCHIVED" },
      actor.id,
    );
    return NextResponse.json({ cohort });
  } catch (error) {
    return handleError(error);
  }
};

export const GET = withPermission(PermissionModule.COURSES, "view", getHandler);
export const PATCH = withPermission(PermissionModule.COURSES, "edit", patchHandler);
export const DELETE = withPermission(PermissionModule.COURSES, "delete", deleteHandler);

function handleError(error: unknown) {
  if (error instanceof AdminCohortError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json(
      { error: "A cohort with this code or name already exists." },
      { status: 409 },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unexpected server error." },
    { status: 500 },
  );
}
