import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireLearner("/settings", {
    module: PermissionModule.SETTINGS,
    action: "view",
  });
  return children;
}
