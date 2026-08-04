import { NextResponse } from "next/server";
import {
  AssessmentAssignmentError,
  createAssessmentAssignments,
  createAssessmentBatch,
  deleteAssessmentAssignment,
  getAssessmentAssignmentData,
  syncAssessmentBatchMembers,
  updateAssessmentAssignmentStatus,
} from "@/lib/assessment-assignment-server";
import type {
  AssessmentAssignmentStatusValue,
  CreateAssessmentAssignmentInput,
} from "@/lib/assessment-assignment-types";
import { getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";

type Context = { params: Promise<{ id: string }> };

const getHandler = async (_request: Request, { params }: Context) => {
  try {
    return NextResponse.json(await getAssessmentAssignmentData((await params).id));
  } catch (error) {
    return handleError(error);
  }
};

const postHandler = async (request: Request, { params }: Context) => {
  try {
    const assessmentId = (await params).id;
    const body = (await request.json()) as
      | ({ action: "createAssignment" } & CreateAssessmentAssignmentInput)
      | { action: "createBatch"; name?: string; startDate?: string | null; endDate?: string | null };
    const actorId = await getActorId();
    if (body.action === "createBatch") {
      return NextResponse.json(
        await createAssessmentBatch(assessmentId, body, actorId),
        { status: 201 },
      );
    }
    return NextResponse.json(
      await createAssessmentAssignments(assessmentId, body, actorId),
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
};

const patchHandler = async (request: Request, { params }: Context) => {
  try {
    const assessmentId = (await params).id;
    const body = (await request.json()) as
      | { action: "syncBatchMembers"; batchId?: string; userIds?: string[] }
      | { action: "updateStatus"; assignmentId?: string; status?: AssessmentAssignmentStatusValue };
    const actorId = await getActorId();
    if (body.action === "syncBatchMembers") {
      if (!body.batchId) throw new AssessmentAssignmentError("Batch is required.");
      return NextResponse.json(
        await syncAssessmentBatchMembers(
          assessmentId,
          body.batchId,
          Array.isArray(body.userIds) ? body.userIds : [],
          actorId,
        ),
      );
    }
    if (!body.assignmentId || !body.status) {
      throw new AssessmentAssignmentError("Assignment and status are required.");
    }
    return NextResponse.json(
      await updateAssessmentAssignmentStatus(
        assessmentId,
        body.assignmentId,
        body.status,
        actorId,
      ),
    );
  } catch (error) {
    return handleError(error);
  }
};

const deleteHandler = async (request: Request, { params }: Context) => {
  try {
    const assignmentId = new URL(request.url).searchParams.get("assignmentId");
    if (!assignmentId) throw new AssessmentAssignmentError("Assignment is required.");
    return NextResponse.json(
      await deleteAssessmentAssignment((await params).id, assignmentId, await getActorId()),
    );
  } catch (error) {
    return handleError(error);
  }
};

function handleError(error: unknown) {
  if (error instanceof AssessmentAssignmentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Error && error.message.includes("Unique constraint")) {
    return NextResponse.json({ error: "A batch with this name already exists." }, { status: 409 });
  }
  console.error("ASSESSMENT_ASSIGNMENT_API_ERROR", error);
  return NextResponse.json({ error: "Assessment assignment operation failed." }, { status: 500 });
}

export const GET = withPermission(PermissionModule.ASSESSMENTS, "view", getHandler);
export const POST = withPermission(PermissionModule.ASSESSMENTS, "edit", postHandler);
export const PATCH = withPermission(PermissionModule.ASSESSMENTS, "edit", patchHandler);
export const DELETE = withPermission(PermissionModule.ASSESSMENTS, "edit", deleteHandler);
