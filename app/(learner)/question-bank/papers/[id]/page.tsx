import QuestionBankPaperPage from "@/components/admin/QuestionBankPaperPage";
import LearnerShell from "@/components/learner/LearnerShell";

export default async function LearnerQuestionBankPaperRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
   
      <QuestionBankPaperPage
        paperId={id}
        basePath="/question-bank"
        canEdit={false}
        useAdminLayout={false}
      />
  );
}
