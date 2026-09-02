import { getModuleQuizAttempts } from "@/lib/admin-course-server";
import { assertCourseResourceAccess } from "@/lib/course-resource-access";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireActiveUser, withPermission } from "@/lib/rbac";
import { NextResponse } from "next/server";

const getQuizAttemptsHandler = async (
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> },
) => {
  const { id, moduleId } = await params;
  await assertCourseResourceAccess(await requireActiveUser(), id);

  const result = await getModuleQuizAttempts(id, moduleId);

  if (result === null) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  return NextResponse.json(result);
};

export const GET = withPermission(
  PermissionModule.COURSES,
  "view",
  getQuizAttemptsHandler,
);
