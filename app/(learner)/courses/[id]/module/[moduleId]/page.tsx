import { notFound } from "next/navigation";
import {
  getModule,
  getModuleNotes,
  getModuleResources,
  getQuizForModule,
} from "@/lib/mock-modules";
import { getCurrentUser } from "@/lib/auth";
import ModuleDetailClient from "@/components/module/module-detail-client";

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = await params;
  const data = await getModule(id, moduleId);
  if (!data) notFound();

  const { course, module } = data;
  const quizData = await getQuizForModule(id, moduleId);
  const notes = getModuleNotes(module);
  const resources = getModuleResources(module);
  const currentUser = getCurrentUser();

  return (
    <ModuleDetailClient
      course={course}
      module={module}
      quiz={quizData?.quiz ?? null}
      notes={notes}
      resources={resources}
      userId={currentUser?.id ?? ""}
    />
  );
}
