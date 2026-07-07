import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ModuleDetailClient from "@/components/module/module-detail-client";

async function getBaseUrl() {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  return `${protocol}://${host}`;
}

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = await params;
  const baseUrl = await getBaseUrl();

  const response = await fetch(
    `${baseUrl}/api/learner/courses/${id}/modules/${moduleId}`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    notFound();
  }

  const data = await response.json();

  return (
    <ModuleDetailClient
      course={data.course}
      module={data.module}
      quiz={data.quiz}
      notes={data.notes}
      resources={data.resources}
      userId={data.userId}
    />
  );
}