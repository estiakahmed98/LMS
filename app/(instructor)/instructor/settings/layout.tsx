import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireInstructor } from "@/lib/instructor-server";

export default async function InstructorSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireInstructor({ module: PermissionModule.SETTINGS, action: "view" });
  return children;
}
