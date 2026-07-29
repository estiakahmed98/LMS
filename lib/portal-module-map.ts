import type { PermissionModule } from "@/lib/generated/prisma/enums";

export interface PortalModuleData {
  columns: string[];
  rows: Array<{ id: string; values: string[] }>;
}

export const PORTAL_MODULES = {
  students: {
    module: "STUDENTS",
    title: "Students",
    description: "Student records available within your permitted scope.",
    adminHref: "/admin/users",
  },
  courses: {
    module: "COURSES",
    title: "Courses",
    description: "Courses available within your permitted scope.",
    adminHref: "/admin/courses",
  },
  assessments: {
    module: "ASSESSMENTS",
    title: "Assessments",
    description: "Assessments available within your permitted scope.",
    adminHref: "/admin/assessments",
  },
  "question-bank": {
    module: "QUESTION_BANK",
    title: "Question Bank",
    description: "Questions and papers available within your permitted scope.",
    adminHref: "/admin/question-bank",
  },
  submissions: {
    module: "SUBMISSIONS",
    title: "Submissions",
    description: "Submissions available within your permitted scope.",
    adminHref: "/admin/submissions",
  },
  grading: {
    module: "GRADING",
    title: "Grading",
    description: "Grading information available within your permitted scope.",
    adminHref: "/admin/grading",
  },
  certificates: {
    module: "CERTIFICATES",
    title: "Certificates",
    description: "Certificates available within your permitted scope.",
    adminHref: "/admin/certificates",
  },
  reports: {
    module: "REPORTS",
    title: "Reports",
    description: "Reports available within your permitted scope.",
    adminHref: "/admin/reports",
  },
  settings: {
    module: "SETTINGS",
    title: "Settings",
    description: "Account settings controlled by your role permissions.",
    adminHref: "/admin/settings",
  },
  roles: {
    module: "ROLES",
    title: "Roles",
    description: "Role information available within your permitted scope.",
    adminHref: "/admin/roles",
  },
} as const satisfies Record<
  string,
  {
    module: PermissionModule;
    title: string;
    description: string;
    adminHref: string;
  }
>;

export type PortalModuleSlug = keyof typeof PORTAL_MODULES;

export function getPortalModule(slug: string) {
  return PORTAL_MODULES[slug as PortalModuleSlug] ?? null;
}
