import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerQuestionBankLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireLearner("/question-bank", {
    module: "QUESTION_BANK",
    action: "view",
  });
  return children;
}
