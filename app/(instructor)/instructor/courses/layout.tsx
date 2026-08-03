import { PermissionModule } from "@/lib/generated/prisma/enums";
import { requireInstructor } from "@/lib/instructor-server";

export default async function InstructorCoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInstructor({
    module: PermissionModule.COURSES,
    action: "view",
  });

  return children;
}
