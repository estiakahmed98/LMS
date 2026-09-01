import {
  createRecording,
  listRecordingFacets,
  listRecordings,
  normalizeRecordingPayload,
} from "@/lib/admin-recording-server";
import { getActorId } from "@/lib/audit";
import type { AdminRecordingListFilters } from "@/lib/admin-recording-types";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const listAll = async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const int = (key: string) => {
    const value = params.get(key);
    return value ? Number(value) : undefined;
  };

  const filters: AdminRecordingListFilters = {
    search: params.get("search") || undefined,
    batchName: params.get("batchName") || undefined,
    subjectName: params.get("subjectName") || undefined,
    dateFrom: params.get("dateFrom") || undefined,
    dateTo: params.get("dateTo") || undefined,
    page: int("page"),
    pageSize: int("pageSize"),
  };

  const [result, facets] = await Promise.all([
    listRecordings(filters),
    params.get("includeFacets") === "true" ? listRecordingFacets() : Promise.resolve(null),
  ]);

  return NextResponse.json(facets ? { ...result, facets } : result);
};

const createOne = async (request: Request) => {
  try {
    const payload = normalizeRecordingPayload(await request.json());
    const actorId = await getActorId();
    const recording = await createRecording(payload, actorId);
    return NextResponse.json({ recording }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
};

export const GET = withPermission(PermissionModule.COURSES, "view", listAll);
export const POST = withPermission(PermissionModule.COURSES, "create", createOne);

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Selected class does not exist." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
