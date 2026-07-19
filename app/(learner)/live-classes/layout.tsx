import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerLiveClassesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireLearner("/live-classes", {
    module: PermissionModule.COURSES,
    action: "view",
  });
  return children;
}
