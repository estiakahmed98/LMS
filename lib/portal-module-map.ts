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
  },
  courses: {
    module: "COURSES",
    title: "Courses",
    description: "Courses available within your permitted scope.",
  },
  assessments: {
    module: "ASSESSMENTS",
    title: "Assessments",
    description: "Assessments available within your permitted scope.",
  },
  "question-bank": {
    module: "QUESTION_BANK",
    title: "Question Bank",
    description: "Questions and papers available within your permitted scope.",
  },
  submissions: {
    module: "SUBMISSIONS",
    title: "Submissions",
    description: "Submissions available within your permitted scope.",
  },
  grading: {
    module: "GRADING",
    title: "Grading",
    description: "Grading information available within your permitted scope.",
  },
  certificates: {
    module: "CERTIFICATES",
    title: "Certificates",
    description: "Certificates available within your permitted scope.",
  },
  reports: {
    module: "REPORTS",
    title: "Reports",
    description: "Reports available within your permitted scope.",
  },
  settings: {
    module: "SETTINGS",
    title: "Settings",
    description: "Account settings controlled by your role permissions.",
  },
  roles: {
    module: "ROLES",
    title: "Roles",
    description: "Role information available within your permitted scope.",
  },
} as const satisfies Record<
  string,
  {
    module: PermissionModule;
    title: string;
    description: string;
  }
>;

export type PortalModuleSlug = keyof typeof PORTAL_MODULES;

export function getPortalModule(slug: string) {
  return PORTAL_MODULES[slug as PortalModuleSlug] ?? null;
}
