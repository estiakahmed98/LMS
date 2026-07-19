import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  PermissionModule,
  Role,
} from "@/lib/generated/prisma/enums";
import type { PortalModuleData } from "@/lib/portal-module-map";

function date(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("en-US") : "—";
}

async function instructorCourseIds(userId: string) {
  const classes = await prisma.liveClass.findMany({
    where: { instructorId: userId },
    select: { courseId: true },
  });
  return [...new Set(classes.map((item) => item.courseId))];
}

async function instructorModuleData(
  userId: string,
  module: PermissionModule,
): Promise<PortalModuleData> {
  const courseIds = await instructorCourseIds(userId);

  switch (module) {
    case "STUDENTS": {
      const rows = await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds }, status: "APPROVED" },
        select: {
          id: true,
          progress: true,
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
        orderBy: { enrolledAt: "desc" },
        take: 50,
      });
      return {
        columns: ["Student", "Email", "Course", "Progress"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [
            row.user.name,
            row.user.email,
            row.course.title,
            `${row.progress}%`,
          ],
        })),
      };
    }
    case "ASSESSMENTS": {
      const rows = await prisma.assessment.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          id: true,
          title: true,
          type: true,
          totalMarks: true,
          course: { select: { title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      return {
        columns: ["Assessment", "Course", "Type", "Marks"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [
            row.title,
            row.course.title,
            row.type,
            String(row.totalMarks),
          ],
        })),
      };
    }
    case "QUESTION_BANK": {
      const rows = await prisma.questionBankItem.findMany({
        where: {
          OR: [{ courseId: { in: courseIds } }, { createdById: userId }],
        },
        select: {
          id: true,
          question: true,
          type: true,
          difficulty: true,
          status: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      return {
        columns: ["Question", "Type", "Difficulty", "Status"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [row.question, row.type, row.difficulty, row.status],
        })),
      };
    }
    case "SUBMISSIONS":
    case "GRADING": {
      const rows = await prisma.submission.findMany({
        where: {
          assessment: { courseId: { in: courseIds } },
          ...(module === "GRADING"
            ? { status: { in: ["SUBMITTED", "GRADING", "GRADED"] as const } }
            : {}),
        },
        select: {
          id: true,
          status: true,
          obtainedMarks: true,
          submittedAt: true,
          user: { select: { name: true } },
          assessment: { select: { title: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      return {
        columns: ["Student", "Assessment", "Status", "Marks", "Submitted"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [
            row.user.name,
            row.assessment.title,
            row.status,
            row.obtainedMarks?.toString() ?? "—",
            date(row.submittedAt),
          ],
        })),
      };
    }
    case "CERTIFICATES": {
      const rows = await prisma.certificate.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          id: true,
          certificateNumber: true,
          issueDate: true,
          user: { select: { name: true } },
          course: { select: { title: true } },
        },
        orderBy: { issueDate: "desc" },
        take: 50,
      });
      return {
        columns: ["Certificate", "Student", "Course", "Issued"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [
            row.certificateNumber,
            row.user.name,
            row.course.title,
            date(row.issueDate),
          ],
        })),
      };
    }
    case "ROLES":
      return ownRoleData(userId);
    default:
      return { columns: [], rows: [] };
  }
}

async function learnerModuleData(
  userId: string,
  module: PermissionModule,
): Promise<PortalModuleData> {
  switch (module) {
    case "STUDENTS": {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, status: true },
      });
      return {
        columns: ["Student", "Email", "Status"],
        rows: user
          ? [
              {
                id: user.id,
                values: [user.name, user.email, user.status],
              },
            ]
          : [],
      };
    }
    case "SUBMISSIONS":
    case "GRADING": {
      const rows = await prisma.submission.findMany({
        where: {
          userId,
          ...(module === "GRADING" ? { status: "GRADED" as const } : {}),
        },
        select: {
          id: true,
          status: true,
          obtainedMarks: true,
          submittedAt: true,
          assessment: {
            select: {
              title: true,
              course: { select: { title: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      });
      return {
        columns: ["Assessment", "Course", "Status", "Marks", "Submitted"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [
            row.assessment.title,
            row.assessment.course.title,
            row.status,
            row.obtainedMarks?.toString() ?? "—",
            date(row.submittedAt),
          ],
        })),
      };
    }
    case "REPORTS": {
      const rows = await prisma.enrollment.findMany({
        where: { userId },
        select: {
          id: true,
          status: true,
          progress: true,
          enrolledAt: true,
          course: { select: { title: true } },
        },
        orderBy: { enrolledAt: "desc" },
      });
      return {
        columns: ["Course", "Enrollment", "Progress", "Enrolled"],
        rows: rows.map((row) => ({
          id: row.id,
          values: [
            row.course.title,
            row.status,
            `${row.progress}%`,
            date(row.enrolledAt),
          ],
        })),
      };
    }
    case "ROLES":
      return ownRoleData(userId);
    default:
      return { columns: [], rows: [] };
  }
}

async function ownRoleData(userId: string): Promise<PortalModuleData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return { columns: [], rows: [] };

  const permissions = await prisma.rolePermission.findMany({
    where: { role: user.role, canView: true },
    select: { module: true },
    orderBy: { module: "asc" },
  });
  return {
    columns: ["Role", "Visible modules"],
    rows: [
      {
        id: user.id,
        values: [
          user.role.replaceAll("_", " "),
          permissions.map((item) => item.module).join(", ") || "None",
        ],
      },
    ],
  };
}

export async function getPortalModuleData(
  user: { id: string; role: Role },
  module: PermissionModule,
) {
  if (user.role === "INSTRUCTOR") {
    return instructorModuleData(user.id, module);
  }
  if (user.role === "STUDENT") {
    return learnerModuleData(user.id, module);
  }
  return { columns: [], rows: [] } satisfies PortalModuleData;
}
