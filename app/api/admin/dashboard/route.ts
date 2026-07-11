import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - 7 * 11);
  trendStart.setHours(0, 0, 0, 0);

  const [
    students,
    activeCourses,
    pendingSubmissions,
    gradedSubmissions,
    certificatesThisMonth,
    liveClasses,
    enrollments,
    categoryCourses,
    activities,
    pendingStudents,
    upcomingSessions,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.submission.count({ where: { status: { in: ["SUBMITTED", "GRADING"] } } }),
    prisma.submission.findMany({ where: { status: { in: ["GRADED", "REVIEWED"] }, obtainedMarks: { not: null } }, select: { obtainedMarks: true, assessment: { select: { passingMarks: true } } } }),
    prisma.certificate.count({ where: { issueDate: { gte: monthStart } } }),
    prisma.liveClass.count({ where: { status: { in: ["ACTIVE", "SCHEDULED"] } } }),
    prisma.enrollment.findMany({ where: { enrolledAt: { gte: trendStart } }, select: { enrolledAt: true } }),
    prisma.course.findMany({ where: { categoryId: { not: null } }, select: { category: { select: { name: true } }, enrollments: { where: { status: "APPROVED" }, select: { progress: true } } } }),
    prisma.auditLog.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
    prisma.user.count({ where: { role: "STUDENT", status: "PENDING" } }),
    prisma.liveClassSession.count({ where: { status: "UPCOMING", scheduledStart: { gte: now } } }),
  ]);

  const passed = gradedSubmissions.filter((item) => (item.obtainedMarks ?? 0) >= item.assessment.passingMarks).length;
  const passRate = gradedSubmissions.length ? Math.round((passed / gradedSubmissions.length) * 100) : 0;

  const weeklyEnrollments = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(trendStart);
    start.setDate(start.getDate() + index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { week: index + 1, enrollments: enrollments.filter((item) => item.enrolledAt >= start && item.enrolledAt < end).length };
  });

  const categories = new Map<string, number[]>();
  for (const course of categoryCourses) {
    const name = course.category?.name ?? "Uncategorized";
    categories.set(name, [...(categories.get(name) ?? []), ...course.enrollments.map((item) => item.progress)]);
  }
  const completionByCategory = [...categories.entries()].map(([name, progress]) => ({
    name,
    value: progress.length ? Math.round(progress.reduce((total, value) => total + value, 0) / progress.length) : 0,
  })).sort((a, b) => b.value - a.value).slice(0, 6);

  return NextResponse.json({
    stats: { students, activeCourses, pendingSubmissions, passRate, certificatesThisMonth, liveClasses },
    weeklyEnrollments,
    newThisWeek: weeklyEnrollments.at(-1)?.enrollments ?? 0,
    completionByCategory,
    activities: activities.map((item) => ({ id: item.id, action: item.action, entity: item.entity, actorName: item.user?.name ?? "System", createdAt: item.createdAt.toISOString() })),
    pending: [
      { id: "submissions", label: "Submissions awaiting review", count: pendingSubmissions, href: "/admin/submissions" },
      { id: "students", label: "Student accounts awaiting approval", count: pendingStudents, href: "/admin/users" },
      { id: "sessions", label: "Upcoming live sessions", count: upcomingSessions, href: "/admin/classes" },
    ],
  });
}
