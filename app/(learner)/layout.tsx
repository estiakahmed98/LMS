import LearnerShell from "@/components/learner/LearnerShell";
import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireLearner("/dashboard");

  return (
    <LearnerShell user={{ name: user.name }}>
      {children}
    </LearnerShell>
  );
}
