import SubmissionDetailPage from "@/components/admin/SubmissionDetailPage";

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubmissionDetailPage submissionId={id} />;
}
