import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireLearner } from "@/lib/learner-auth-server";

export default async function LearnerCoursesLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireLearner("/courses", {
    module: PermissionModule.COURSES,
    action: "view",
  });
  return children;
}
