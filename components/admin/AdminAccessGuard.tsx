"use client";

import { LoaderCircle, ShieldX } from "lucide-react";
import { usePathname } from "next/navigation";
import type { PermissionModuleValue } from "@/lib/admin-role-types";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";

const routeModules: Array<{
  prefix: string;
  module: PermissionModuleValue;
}> = [
  { prefix: "/instructor/courses", module: "COURSES" },
  { prefix: "/instructor/question-bank", module: "QUESTION_BANK" },
  { prefix: "/instructor/assessments", module: "ASSESSMENTS" },
  { prefix: "/instructor/submissions", module: "SUBMISSIONS" },
  { prefix: "/instructor/certificates", module: "CERTIFICATES" },
  { prefix: "/instructor/reports", module: "REPORTS" },
  { prefix: "/instructor/students", module: "STUDENTS" },
  { prefix: "/instructor/grading", module: "GRADING" },
  { prefix: "/instructor/roles", module: "ROLES" },
  { prefix: "/admin/dashboard", module: "REPORTS" },
  { prefix: "/admin/question-bank", module: "QUESTION_BANK" },
  { prefix: "/admin/assessments", module: "ASSESSMENTS" },
  { prefix: "/admin/submissions", module: "SUBMISSIONS" },
  { prefix: "/admin/certificates", module: "CERTIFICATES" },
  { prefix: "/admin/activity-log", module: "ROLES" },
  { prefix: "/admin/instructors", module: "STUDENTS" },
  { prefix: "/admin/recordings", module: "COURSES" },
  { prefix: "/admin/notifications", module: "SETTINGS" },
  { prefix: "/admin/settings", module: "SETTINGS" },
  { prefix: "/admin/grading", module: "GRADING" },
  { prefix: "/admin/reports", module: "REPORTS" },
  { prefix: "/admin/courses", module: "COURSES" },
  { prefix: "/admin/cohorts", module: "COURSES" },
  { prefix: "/admin/classes", module: "COURSES" },
  { prefix: "/admin/users", module: "STUDENTS" },
  { prefix: "/admin/roles", module: "ROLES" },
];

function moduleForPath(pathname: string) {
  return routeModules.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.module;
}

export default function AdminAccessGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { loading, error, role, can } = useAdminPermissions();
  const module = moduleForPath(pathname);

  if (!module) return children;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-5 w-5 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (error || role === "STUDENT" || !can(module, "view")) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <ShieldX className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 text-xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ??
              (role === "STUDENT"
                ? "Admin pages are not available in the student portal."
                : "Your role does not have permission to view this module.")}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
