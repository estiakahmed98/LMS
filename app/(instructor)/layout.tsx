import InstructorShell from "@/components/instructor/InstructorShell";
import {
  getInstructorProfile,
  requireInstructor,
} from "@/lib/instructor-server";
import { getRolePermissions } from "@/lib/rbac";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireInstructor(null);
  const profile = await getInstructorProfile(user.id);
  const permissions = await getRolePermissions("INSTRUCTOR");

  return (
    <InstructorShell
      user={{
        name: profile.name,
        photoUrl: profile.photoUrl,
      }}
      visibleModules={permissions
        .filter((permission) => permission.canView)
        .map((permission) => permission.module)}
    >
      {children}
    </InstructorShell>
  );
}
