import StudentProfilePage from "@/components/admin/StudentProfilePage";
import { getStudentProfile } from "@/lib/admin-report-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { assertRolePermission, requirePermission } from "@/lib/rbac";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStudentProfileRoute({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { studentId } = await params;
  const { print } = await searchParams;
  const user = await requirePermission(PermissionModule.REPORTS, "view");
  const profile = await getStudentProfile(studentId);

  if (!profile) notFound();

  let canExport = true;
  try {
    await assertRolePermission(user.role, PermissionModule.REPORTS, "export");
  } catch {
    canExport = false;
  }

  return (
    <StudentProfilePage
      profile={profile}
      canExport={canExport}
      autoPrint={print === "1"}
    />
  );
}
