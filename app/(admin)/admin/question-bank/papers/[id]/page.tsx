import QuestionBankPaperPage from "@/components/admin/QuestionBankPaperPage";

export default async function QuestionBankPaperRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuestionBankPaperPage paperId={id} />;
}
