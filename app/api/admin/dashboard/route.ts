import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const pct = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

export async function GET() {
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 30);
  const inactiveCutoff = new Date(now);
  inactiveCutoff.setDate(inactiveCutoff.getDate() - 14);
  const sixMonthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    students, newStudents, previousStudents, instructors, publishedCourses, draftCourses,
    enrollments, recentEnrollments, gradedSubmissions, pendingSubmissions,
    certificatesThisMonth, activeClasses, attendance, categoryCourses, courses,
    instructorRows, activities, pendingStudents, upcomingSessions, enrollmentStatuses,
    submissionStatuses, recentCertificates, atRiskCount, atRiskRows,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: currentStart } } }),
    prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: previousStart, lt: currentStart } } }),
    prisma.user.count({ where: { role: "INSTRUCTOR", status: "ACTIVE" } }),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.course.count({ where: { status: "DRAFT" } }),
    prisma.enrollment.findMany({ select: { status: true, progress: true, enrolledAt: true, completedAt: true } }),
    prisma.enrollment.findMany({ where: { enrolledAt: { gte: sixMonthStart } }, select: { enrolledAt: true, completedAt: true } }),
    prisma.submission.findMany({ where: { status: { in: ["GRADED", "REVIEWED"] }, obtainedMarks: { not: null } }, select: { obtainedMarks: true, assessment: { select: { passingMarks: true } } } }),
    prisma.submission.count({ where: { status: { in: ["SUBMITTED", "GRADING"] } } }),
    prisma.certificate.count({ where: { issueDate: { gte: monthStart } } }),
    prisma.liveClass.count({ where: { status: { in: ["ACTIVE", "SCHEDULED"] } } }),
    prisma.liveClassAttendance.findMany({ select: { status: true, durationMinutes: true } }),
    prisma.course.findMany({ where: { categoryId: { not: null } }, select: { category: { select: { name: true } }, enrollments: { where: { status: "APPROVED" }, select: { progress: true } } } }),
    prisma.course.findMany({ select: { id: true, title: true, status: true, enrollments: { select: { progress: true, status: true } }, assessments: { select: { submissions: { where: { status: { in: ["GRADED", "REVIEWED"] }, obtainedMarks: { not: null } }, select: { obtainedMarks: true }, }, passingMarks: true } } } }),
    prisma.user.findMany({ where: { role: "INSTRUCTOR" }, select: { id: true, name: true, status: true, liveClasses: { select: { id: true, sessions: { select: { status: true } } } } }, orderBy: { name: "asc" } }),
    prisma.auditLog.findMany({ take: 7, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
    prisma.user.count({ where: { role: "STUDENT", status: "PENDING" } }),
    prisma.liveClassSession.findMany({ where: { status: "UPCOMING", scheduledStart: { gte: now } }, take: 6, orderBy: { scheduledStart: "asc" }, select: { id: true, scheduledStart: true, scheduledEnd: true, liveClass: { select: { id: true, title: true, batchName: true, instructor: { select: { name: true } } } } } }),
    prisma.enrollment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.certificate.findMany({ where: { issueDate: { gte: sixMonthStart } }, select: { issueDate: true } }),
    prisma.user.count({ where: { role: "STUDENT", enrollments: { some: { status: "APPROVED", progress: { lt: 40 } } }, OR: [{ lastActive: null }, { lastActive: { lt: inactiveCutoff } }] } }),
    prisma.user.findMany({ where: { role: "STUDENT", enrollments: { some: { status: "APPROVED", progress: { lt: 40 } } }, OR: [{ lastActive: null }, { lastActive: { lt: inactiveCutoff } }] }, take: 6, orderBy: { lastActive: "asc" }, select: { id: true, name: true, lastActive: true, enrollments: { where: { status: "APPROVED", progress: { lt: 40 } }, select: { progress: true, course: { select: { title: true } } } } } }),
  ]);

  const approved = enrollments.filter((item) => item.status === "APPROVED");
  const completed = approved.filter((item) => item.progress >= 100);
  const passed = gradedSubmissions.filter((item) => (item.obtainedMarks ?? 0) >= item.assessment.passingMarks).length;
  const present = attendance.filter((item) => item.status === "PRESENT" || item.status === "LATE").length;
  const studentGrowth = previousStudents ? Math.round(((newStudents - previousStudents) / previousStudents) * 100) : newStudents ? 100 : 0;

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 4 + index, 1);
    return {
      label: start.toLocaleString("en-US", { month: "short" }),
      enrollments: recentEnrollments.filter((item) => item.enrolledAt >= start && item.enrolledAt < end).length,
      completions: recentEnrollments.filter((item) => item.completedAt && item.completedAt >= start && item.completedAt < end).length,
      certificates: recentCertificates.filter((item) => item.issueDate >= start && item.issueDate < end).length,
    };
  });

  const categories = new Map<string, number[]>();
  for (const course of categoryCourses) {
    const name = course.category?.name ?? "Uncategorized";
    categories.set(name, [...(categories.get(name) ?? []), ...course.enrollments.map((item) => item.progress)]);
  }

  const coursePerformance = courses.map((course) => {
    const approvedCourse = course.enrollments.filter((item) => item.status === "APPROVED");
    const scores = course.assessments.flatMap((assessment) => assessment.submissions.map((submission) => ({ score: submission.obtainedMarks ?? 0, passing: assessment.passingMarks })));
    return { id: course.id, title: course.title, status: course.status, learners: approvedCourse.length, averageProgress: average(approvedCourse.map((item) => item.progress)), completionRate: pct(approvedCourse.filter((item) => item.progress >= 100).length, approvedCourse.length), passRate: pct(scores.filter((item) => item.score >= item.passing).length, scores.length) };
  }).sort((a, b) => b.learners - a.learners).slice(0, 7);

  return NextResponse.json({
    generatedAt: now.toISOString(),
    executive: { students, newStudents, studentGrowth, publishedCourses, instructors, activeEnrollments: approved.length, completionRate: pct(completed.length, approved.length), averageProgress: average(approved.map((item) => item.progress)), passRate: pct(passed, gradedSubmissions.length), certificatesThisMonth, attendanceRate: pct(present, attendance.length) },
    operations: { draftCourses, pendingSubmissions, pendingStudents, activeClasses, upcomingSessions: upcomingSessions.length, atRiskStudents: atRiskCount },
    monthlyTrend,
    completionByCategory: [...categories.entries()].map(([name, values]) => ({ name, value: average(values), learners: values.length })).sort((a, b) => b.learners - a.learners).slice(0, 6),
    enrollmentStatuses: enrollmentStatuses.map((item) => ({ status: item.status, count: item._count._all })),
    submissionStatuses: submissionStatuses.map((item) => ({ status: item.status, count: item._count._all })),
    coursePerformance,
    instructorWorkload: instructorRows.map((item) => { const sessions = item.liveClasses.flatMap((liveClass) => liveClass.sessions); return { id: item.id, name: item.name, status: item.status, classes: item.liveClasses.length, completed: sessions.filter((session) => session.status === "COMPLETED").length, upcoming: sessions.filter((session) => session.status === "UPCOMING" || session.status === "LIVE").length }; }).sort((a, b) => b.classes - a.classes).slice(0, 6),
    atRiskStudents: atRiskRows.map((item) => ({ id: item.id, name: item.name, lastActive: item.lastActive?.toISOString() ?? null, course: item.enrollments[0]?.course.title ?? "No course", progress: item.enrollments[0]?.progress ?? 0 })),
    upcomingSchedule: upcomingSessions.map((item) => ({ id: item.id, classId: item.liveClass.id, title: item.liveClass.title, batch: item.liveClass.batchName, instructor: item.liveClass.instructor.name, start: item.scheduledStart.toISOString(), end: item.scheduledEnd.toISOString() })),
    activities: activities.map((item) => ({ id: item.id, action: item.action, entity: item.entity, actorName: item.user?.name ?? "System", createdAt: item.createdAt.toISOString() })),
    pending: [
      { id: "submissions", label: "Submissions awaiting review", count: pendingSubmissions, href: "/admin/submissions", severity: pendingSubmissions > 10 ? "high" : "normal" },
      { id: "students", label: "Student accounts awaiting approval", count: pendingStudents, href: "/admin/users", severity: pendingStudents > 10 ? "high" : "normal" },
      { id: "risk", label: "Inactive learners with low progress", count: atRiskCount, href: "/admin/users", severity: atRiskCount ? "high" : "normal" },
      { id: "drafts", label: "Draft courses awaiting publication", count: draftCourses, href: "/admin/courses", severity: "normal" },
    ],
  });
}
