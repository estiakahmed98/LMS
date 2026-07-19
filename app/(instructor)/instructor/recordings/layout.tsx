import type { ReactNode } from "react";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireInstructor } from "@/lib/instructor-server";

export default async function InstructorRecordingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireInstructor({ module: PermissionModule.COURSES, action: "view" });
  return children;
}
