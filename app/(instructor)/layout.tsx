import { redirect } from "next/navigation";
import InstructorShell from "@/components/instructor/InstructorShell";
import { getCurrentUserServer } from "@/lib/auth-server";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserServer("/instructor/dashboard");

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "INSTRUCTOR") {
    if (
      user.role === "SUPER_ADMIN" ||
      user.role === "COURSE_MANAGER" ||
      user.role === "EXAMINER" ||
      user.role === "REPORT_VIEWER"
    ) {
      redirect("/admin/dashboard");
    }
    redirect("/dashboard");
  }

  return (
    <InstructorShell user={{ name: user.name }}>
      {children}
    </InstructorShell>
  );
}
