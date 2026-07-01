import LearnerShell from "@/components/learner/LearnerShell";
import { getCurrentUser } from "@/lib/auth";

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getCurrentUser();

  return (
    <LearnerShell user={user ? { name: user.name } : undefined}>
      {children}
    </LearnerShell>
  );
}
