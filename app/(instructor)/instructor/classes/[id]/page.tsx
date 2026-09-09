import InstructorClassDetailsPage from "@/components/instructor/InstructorClassDetailsPage";

export default async function InstructorClassDetailsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InstructorClassDetailsPage sessionId={id} />;
}
