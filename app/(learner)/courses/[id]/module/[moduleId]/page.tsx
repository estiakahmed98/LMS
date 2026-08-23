import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ModuleDetailClient from "@/components/module/module-detail-client";

function isLocalHost(host: string) {
  const hostname = host.split(":")[0].toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::1]"
  );
}

async function getBaseUrl() {
  const headersList = await headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000";

  // Trust the proxy's protocol when present; otherwise assume plain HTTP for
  // local hosts so `next start` over http:// doesn't attempt a TLS handshake.
  const forwardedProto = headersList
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  const protocol = forwardedProto || (isLocalHost(host) ? "http" : "https");

  return `${protocol}://${host}`;
}

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = await params;
  const baseUrl = await getBaseUrl();
  const cookie = (await headers()).get("cookie") ?? "";

  const response = await fetch(
    `${baseUrl}/api/learner/courses/${id}/modules/${moduleId}`,
    {
      cache: "no-store",
      headers: { cookie },
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
      course={{
        ...data.course,
        modules: data.course?.modules ?? [],
      }}
      module={data.module}
      quiz={data.quiz ?? null}
      notes={data.notes ?? []}
      resources={data.resources ?? []}
      userId={data.userId ?? ""}
    />
  );
}