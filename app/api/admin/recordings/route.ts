import {
  createRecording,
  listRecordings,
  normalizeRecordingPayload,
} from "@/lib/admin-recording-server";
import { getActorId } from "@/lib/audit";
import { Prisma } from "@/lib/generated/prisma/client";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const listAll = async () => {
  const recordings = await listRecordings();
  return NextResponse.json({ recordings });
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
