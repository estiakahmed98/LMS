import QuestionBankCrudPage from "@/components/admin/QuestionBankCrudPage";

export default function LearnerQuestionBankPage() {
  return (
   
      <QuestionBankCrudPage
        basePath="/question-bank"
        canEdit={false}
        useAdminLayout={false}
      />

  );
}
