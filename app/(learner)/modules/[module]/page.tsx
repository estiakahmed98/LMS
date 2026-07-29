import { notFound, redirect } from "next/navigation";
import { requireLearner } from "@/lib/learner-auth-server";
import { getPortalModule } from "@/lib/portal-module-map";

export default async function LearnerModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const definition = getPortalModule(slug);
  if (!definition) notFound();

  const user = await requireLearner(`/modules/${slug}`, {
    module: definition.module,
    action: "view",
  });
  void user;

  redirect(definition.adminHref);
}
