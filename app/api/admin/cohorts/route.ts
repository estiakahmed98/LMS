import { NextResponse } from "next/server";
import {
  AdminCohortError,
  createCohort,
  listCohorts,
  normalizeCohortPayload,
} from "@/lib/admin-cohort-server";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireActiveUser, withPermission } from "@/lib/rbac";

const getHandler = async () => NextResponse.json({ cohorts: await listCohorts() });

const postHandler = async (request: Request) => {
  try {
    const actor = await requireActiveUser();
    const cohort = await createCohort(
      normalizeCohortPayload(await request.json()),
      actor.id,
    );
    return NextResponse.json({ cohort }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

export const GET = withPermission(PermissionModule.COURSES, "view", getHandler);
export const POST = withPermission(PermissionModule.COURSES, "create", postHandler);

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
