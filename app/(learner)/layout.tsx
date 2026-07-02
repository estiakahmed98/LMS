import LearnerShell from "@/components/learner/LearnerShell";
import { getCurrentUserServer } from "@/lib/auth-server";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer("/dashboard");

  return (
    <LearnerShell user={user ? { name: user.name } : undefined}>
      {children}
    </LearnerShell>
  );
}
