import McqAnswerSheetPage from "@/components/admin/McqAnswerSheetPage";
import { getAdminMcqAnswerSheet } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import { requireInstructor } from "@/lib/instructor-server";
import { assertRolePermission, RbacError } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorMcqResultPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const instructor = await requireInstructor({
    module: PermissionModule.REPORTS,
    action: "view",
  });
  const courseIds = [...(await listInstructorAssignedCourseIds(instructor.id))];
  const sheet = await getAdminMcqAnswerSheet(submissionId, courseIds);

  if (!sheet) notFound();

  let canExport = true;
  try {
    await assertRolePermission(instructor.role, PermissionModule.REPORTS, "export");
  } catch (error) {
    if (error instanceof RbacError) {
      canExport = false;
    } else {
      throw error;
    }
  }

  return (
    <McqAnswerSheetPage
      sheet={sheet}
      canExport={canExport}
      backHref="/instructor/reports"
      wrapInAdminLayout={false}
    />
  );
}
