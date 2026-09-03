import { NextResponse } from "next/server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import {
  createGradingWorkflowRule,
  getGradingWorkflowConfiguration,
  GradingWorkflowError,
} from "@/lib/grading-workflow-server";

function handleError(error: unknown) {
  if (error instanceof GradingWorkflowError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("GRADING_WORKFLOW_RULE_ERROR", error);
  return NextResponse.json({ error: "Failed to manage grading workflow rules." }, { status: 500 });
}

const getHandler = async () => {
  try {
    return NextResponse.json(await getGradingWorkflowConfiguration());
  } catch (error) {
    return handleError(error);
  }
};

const postHandler = async (request: Request) => {
  try {
    return NextResponse.json({ rule: await createGradingWorkflowRule(await request.json()) }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
};

export const GET = withPermission(PermissionModule.GRADING, "view", getHandler);
export const POST = withPermission(PermissionModule.GRADING, "edit", postHandler);
