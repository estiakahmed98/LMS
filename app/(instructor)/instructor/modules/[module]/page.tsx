import { notFound, redirect } from "next/navigation";
import { requireInstructor } from "@/lib/instructor-server";
import { getPortalModule } from "@/lib/portal-module-map";

export default async function InstructorModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: slug } = await params;
  const definition = getPortalModule(slug);
  if (!definition) notFound();

  const user = await requireInstructor({
    module: definition.module,
    action: "view",
  });
  void user;

  redirect(definition.adminHref);
}
