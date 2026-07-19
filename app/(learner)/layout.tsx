import LearnerShell from "@/components/learner/LearnerShell";
import { requireLearner } from "@/lib/learner-auth-server";
import { getRolePermissions } from "@/lib/rbac";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLearner("/dashboard", null);
  const permissions = await getRolePermissions("STUDENT");

  return (
    <LearnerShell
      user={{ name: user.name }}
      visibleModules={permissions
        .filter((permission) => permission.canView)
        .map((permission) => permission.module)}
    >
      {children}
    </LearnerShell>
  );
}
