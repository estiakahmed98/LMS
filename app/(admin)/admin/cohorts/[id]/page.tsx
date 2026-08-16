import AdminCohortDetailPage from "@/components/admin/AdminCohortDetailPage";

export default async function CohortDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminCohortDetailPage cohortId={id} />;
}
