import InstructorShell from "@/components/instructor/InstructorShell";
import { getCurrentUserServer } from "@/lib/auth-server";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer("/instructor/dashboard");

  return (
    <InstructorShell user={user ? { name: user.name } : undefined}>
      {children}
    </InstructorShell>
  );
}
