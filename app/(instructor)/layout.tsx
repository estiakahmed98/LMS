import InstructorShell from "@/components/instructor/InstructorShell";
import {
  getInstructorProfile,
  requireInstructor,
} from "@/lib/instructor-server";
import { getRolePermissions } from "@/lib/rbac";
import AdminSWRProvider from "@/components/providers/AdminSWRProvider";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireInstructor(null);
  const profile = await getInstructorProfile(user.id);
  const permissions = await getRolePermissions("INSTRUCTOR");

  return (
    <AdminSWRProvider>
      <InstructorShell
        user={{
          name: profile.name,
          photoUrl: profile.photoUrl,
        }}
        permissions={permissions}
      >
        {children}
      </InstructorShell>
    </AdminSWRProvider>
  );
}
