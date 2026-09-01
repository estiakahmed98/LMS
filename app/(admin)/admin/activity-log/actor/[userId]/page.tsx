import AdminActivityActorPage from "@/components/admin/AdminActivityActorPage";

export default async function ActivityLogActorPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <AdminActivityActorPage userId={userId} />;
}
