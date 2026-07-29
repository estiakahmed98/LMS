import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerResultsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireLearner("/results", {
    module: PermissionModule.ASSESSMENTS,
    action: "view",
  });
  return children;
}
