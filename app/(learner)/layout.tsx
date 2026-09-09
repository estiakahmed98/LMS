import LearnerShell from "@/components/learner/LearnerShell";
import { requireLearner } from "@/lib/learner-auth-server";
import { getRolePermissions } from "@/lib/rbac";
import AdminSWRProvider from "@/components/providers/AdminSWRProvider";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLearner("/dashboard", null);
  const permissions = await getRolePermissions("STUDENT");

  return (
    <AdminSWRProvider>
      <LearnerShell
        user={{ name: user.name }}
        permissions={permissions}
      >
        {children}
      </LearnerShell>
    </AdminSWRProvider>
  );
}
