import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  deleteGradingWorkflowRule,
  GradingWorkflowError,
  updateGradingWorkflowRule,
} from "@/lib/grading-workflow-server";

function handleError(error: unknown) {
  if (error instanceof GradingWorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("GRADING_WORKFLOW_RULE_ITEM_ERROR", error);
  return NextResponse.json({ error: "Failed to manage grading workflow rule." }, { status: 500 });
}

const patchHandler = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    return NextResponse.json({ rule: await updateGradingWorkflowRule(id, await request.json()) });
  } catch (error) {
    return handleError(error);
  }
};

const deleteHandler = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    await deleteGradingWorkflowRule(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
};

export const PATCH = withPermission(PermissionModule.GRADING, "edit", patchHandler);
export const DELETE = withPermission(PermissionModule.GRADING, "edit", deleteHandler);
