import ConsolidatedMarksheetPage from "@/components/admin/ConsolidatedMarksheetPage";
import { getConsolidatedMarksheet } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { assertRolePermission, requirePermission } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMarksheetPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;
  const user = await requirePermission(PermissionModule.REPORTS, "view");
  const marksheet = await getConsolidatedMarksheet(studentId, courseId);

  if (!marksheet) notFound();

  let canExport = true;
  try {
    await assertRolePermission(user.role, PermissionModule.REPORTS, "export");
  } catch {
    canExport = false;
  }

  return (
    <ConsolidatedMarksheetPage
      marksheet={marksheet}
      canExport={canExport}
    />
  );
}
