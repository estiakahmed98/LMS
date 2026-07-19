import AdminLayout from "@/components/AdminLayout";
import QuestionBankPaperPage from "@/components/admin/QuestionBankPaperPage";

export default async function QuestionBankPaperRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminLayout title="Question Paper">
      <QuestionBankPaperPage paperId={id} useAdminLayout={false} />
    </AdminLayout>
  );
}
