import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerAssessmentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireLearner("/assessments", {
    module: PermissionModule.ASSESSMENTS,
    action: "view",
  });
  return children;
}
