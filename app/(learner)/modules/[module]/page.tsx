import { notFound } from "next/navigation";
import PortalModuleAccessPage from "@/components/portal/PortalModuleAccessPage";
import { requireLearner } from "@/lib/learner-auth-server";
import { getPortalModule } from "@/lib/portal-module-map";
import { getPortalModuleData } from "@/lib/portal-module-server";

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
  const data = await getPortalModuleData(user, definition.module);

  return <PortalModuleAccessPage {...definition} data={data} />;
}
