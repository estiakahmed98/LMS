import McqAnswerSheetPage from "@/components/admin/McqAnswerSheetPage";
import { getAdminMcqAnswerSheet } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { assertRolePermission, requirePermission } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMcqResultPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const user = await requirePermission(PermissionModule.REPORTS, "view");
  const sheet = await getAdminMcqAnswerSheet(submissionId);

  if (!sheet) notFound();

  let canExport = true;
  try {
    await assertRolePermission(user.role, PermissionModule.REPORTS, "export");
  } catch {
    canExport = false;
  }

  return <McqAnswerSheetPage sheet={sheet} canExport={canExport} />;
}
