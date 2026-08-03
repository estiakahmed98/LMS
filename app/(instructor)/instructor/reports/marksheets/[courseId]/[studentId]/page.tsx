import ConsolidatedMarksheetPage from "@/components/admin/ConsolidatedMarksheetPage";
import { getConsolidatedMarksheet } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { listInstructorAssignedCourseIds } from "@/lib/instructor-course-access";
import { requireInstructor } from "@/lib/instructor-server";
import { assertRolePermission, RbacError } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InstructorMarksheetPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;
  const instructor = await requireInstructor({
    module: PermissionModule.REPORTS,
    action: "view",
  });
  const courseIds = [...(await listInstructorAssignedCourseIds(instructor.id))];
  const marksheet = await getConsolidatedMarksheet(studentId, courseId, courseIds);

  if (!marksheet) notFound();

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
    <ConsolidatedMarksheetPage
      marksheet={marksheet}
      canExport={canExport}
      backHref="/instructor/reports"
      wrapInAdminLayout={false}
    />
  );
}
