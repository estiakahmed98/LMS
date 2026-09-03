import { decodeAssessmentSubmissionPayload } from "@/lib/assessment-submission-payload";
import type {
  AdminAssessmentReportRow,
  AdminMarksheetRow,
  AdminMcqResultRow,
  AdminReportStats,
  AdminReportType,
  AdminStudentReportRow,
} from "@/lib/admin-report-types";
import type {
  InstructorReportsPayload,
  InstructorReportsQuery,
  InstructorReportRow,
} from "@/lib/instructor-report-types";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const REPORT_YEARS = 10;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const VALID_REPORTS = new Set<AdminReportType>([
  "overview", "course", "assessment", "marksheet", "student", "mcq", "certificate",
]);

function reportCutoff() {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - REPORT_YEARS);
  return date;
}

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function parsePaging(query: InstructorReportsQuery) {
  const page = Number.isInteger(query.page) && (query.page ?? 0) > 0 ? query.page! : 1;
  const pageSize = Number.isInteger(query.pageSize) && (query.pageSize ?? 0) > 0
    ? Math.min(query.pageSize!, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function emptyStats(): AdminReportStats {
  return {
    totalStudents: 0, totalAssessments: 0, totalSubmissions: 0,
    totalCertificates: 0, passRate: 0, failRate: 0, completionRate: 0,
    averageScore: 0, atRiskStudents: 0, gradingBacklog: 0, attendanceRate: 0,
  };
}

async function getStats(courseIds: string[], cutoff: Date): Promise<AdminReportStats> {
  if (courseIds.length === 0) return emptyStats();
  const [totalStudents, totalAssessments, totalSubmissions, totalCertificates, completion, backlog] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", enrollments: { some: { status: "APPROVED", courseId: { in: courseIds }, enrolledAt: { gte: cutoff } } } } }),
    prisma.assessment.count({ where: { courseId: { in: courseIds }, createdAt: { gte: cutoff } } }),
    prisma.submission.count({ where: { user: { role: "STUDENT" }, submittedAt: { gte: cutoff }, assessment: { courseId: { in: courseIds } } } }),
    prisma.certificate.count({ where: { user: { role: "STUDENT" }, courseId: { in: courseIds }, issueDate: { gte: cutoff } } }),
    prisma.enrollment.groupBy({ by: ["progress"], where: { status: "APPROVED", courseId: { in: courseIds }, enrolledAt: { gte: cutoff }, user: { role: "STUDENT" } }, _count: { _all: true } }),
    prisma.submission.count({ where: { status: { in: ["SUBMITTED", "GRADING"] }, submittedAt: { gte: cutoff }, assessment: { courseId: { in: courseIds } }, user: { role: "STUDENT" } } }),
  ]);
  const enrollmentCount = completion.reduce((sum, row) => sum + row._count._all, 0);
  const completed = completion.filter((row) => row.progress >= 100).reduce((sum, row) => sum + row._count._all, 0);
  return { ...emptyStats(), totalStudents, totalAssessments, totalSubmissions, totalCertificates, gradingBacklog: backlog, completionRate: pct(completed, enrollmentCount) };
}

async function listCourseRows(courseIds: string[], cutoff: Date, page: number, pageSize: number, skip: number) {
  const [courses, total] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip, take: pageSize }),
    prisma.course.count({ where: { id: { in: courseIds } } }),
  ]);
  const ids = courses.map((course) => course.id);
  if (!ids.length) return { rows: [] as InstructorReportRow[], total };
  const [enrollments, assessments, graded] = await Promise.all([
    prisma.enrollment.groupBy({ by: ["courseId"], where: { courseId: { in: ids }, status: "APPROVED", enrolledAt: { gte: cutoff }, user: { role: "STUDENT" } }, _count: { _all: true }, _avg: { progress: true } }),
    prisma.assessment.groupBy({ by: ["courseId"], where: { courseId: { in: ids }, createdAt: { gte: cutoff } }, _count: { _all: true } }),
    prisma.$queryRaw<Array<{ courseId: string; graded: bigint; passed: bigint; completed: bigint }>>(Prisma.sql`
      SELECT a."courseId", COUNT(s.id)::bigint AS graded,
        COUNT(s.id) FILTER (WHERE s."obtainedMarks" >= a."passingMarks")::bigint AS passed,
        0::bigint AS completed
      FROM submissions s JOIN assessments a ON a.id = s."assessmentId"
      WHERE a."courseId" IN (${Prisma.join(ids)}) AND s."submittedAt" >= ${cutoff}
        AND s.status IN ('GRADED', 'REVIEWED') AND s."obtainedMarks" IS NOT NULL
      GROUP BY a."courseId"
    `),
  ]);
  const enrollmentMap = new Map(enrollments.map((row) => [row.courseId, row]));
  const assessmentMap = new Map(assessments.map((row) => [row.courseId, row._count._all]));
  const gradedMap = new Map(graded.map((row) => [row.courseId, row]));
  const completedGroups = await prisma.enrollment.groupBy({ by: ["courseId"], where: { courseId: { in: ids }, status: "APPROVED", progress: { gte: 100 }, enrolledAt: { gte: cutoff }, user: { role: "STUDENT" } }, _count: { _all: true } });
  const completedMap = new Map(completedGroups.map((row) => [row.courseId, row._count._all]));
  return {
    total,
    rows: courses.map((course) => {
      const enrollment = enrollmentMap.get(course.id);
      const score = gradedMap.get(course.id);
      return { courseId: course.id, course: course.title, students: enrollment?._count._all ?? 0, assessments: assessmentMap.get(course.id) ?? 0, completed: completedMap.get(course.id) ?? 0, avgProgress: Math.round(enrollment?._avg.progress ?? 0), passRate: pct(Number(score?.passed ?? 0), Number(score?.graded ?? 0)) };
    }),
  };
}

async function listAssessmentRows(courseIds: string[], query: InstructorReportsQuery, cutoff: Date, pageSize: number, skip: number) {
  const assessmentType = ["MCQ", "WRITTEN", "PRACTICAL", "MIXED"].includes(
    query.assessmentType ?? "",
  )
    ? (query.assessmentType as "MCQ" | "WRITTEN" | "PRACTICAL" | "MIXED")
    : null;
  const where: Prisma.AssessmentWhereInput = {
    courseId: { in: courseIds },
    createdAt: { gte: cutoff },
    ...(assessmentType ? { type: assessmentType } : {}),
  };
  const [assessments, total] = await Promise.all([
    prisma.assessment.findMany({ where, select: { id: true, title: true, courseId: true, type: true, totalMarks: true, passingMarks: true, course: { select: { title: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take: pageSize }),
    prisma.assessment.count({ where }),
  ]);
  const ids = assessments.map((item) => item.id);
  const aggregate = ids.length ? await prisma.$queryRaw<Array<{ assessmentId: string; submissions: bigint; pending: bigint; graded: bigint; passed: bigint; avgScore: number | null }>>(Prisma.sql`
    SELECT s."assessmentId", COUNT(*)::bigint AS submissions,
      COUNT(*) FILTER (WHERE s.status IN ('SUBMITTED','GRADING'))::bigint AS pending,
      COUNT(*) FILTER (WHERE s.status IN ('GRADED','REVIEWED') AND s."obtainedMarks" IS NOT NULL)::bigint AS graded,
      COUNT(*) FILTER (WHERE s.status IN ('GRADED','REVIEWED') AND s."obtainedMarks" >= a."passingMarks")::bigint AS passed,
      AVG(s."obtainedMarks") FILTER (WHERE s.status IN ('GRADED','REVIEWED'))::float AS "avgScore"
    FROM submissions s JOIN assessments a ON a.id=s."assessmentId"
    WHERE s."assessmentId" IN (${Prisma.join(ids)}) AND s."submittedAt" >= ${cutoff}
    GROUP BY s."assessmentId"
  `) : [];
  const byId = new Map(aggregate.map((row) => [row.assessmentId, row]));
  const rows: AdminAssessmentReportRow[] = assessments.map((item) => { const agg = byId.get(item.id); return { id: item.id, assessment: item.title, courseId: item.courseId, course: item.course.title, type: item.type, totalMarks: item.totalMarks, passingMarks: item.passingMarks, submissions: Number(agg?.submissions ?? 0), pending: Number(agg?.pending ?? 0), avgScore: Math.round(agg?.avgScore ?? 0), passRate: pct(Number(agg?.passed ?? 0), Number(agg?.graded ?? 0)) }; });
  return { rows, total };
}

async function listEnrollmentRows(courseIds: string[], report: "marksheet" | "student", cutoff: Date, pageSize: number, skip: number) {
  const where: Prisma.EnrollmentWhereInput = { courseId: { in: courseIds }, status: "APPROVED", enrolledAt: { gte: cutoff }, user: { role: "STUDENT" } };
  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({ where, select: { userId: true, courseId: true, progress: true, enrolledAt: true, user: { select: { name: true, email: true } }, course: { select: { title: true } }, batchEnrollments: { select: { batchCourse: { select: { batchId: true } } } } }, orderBy: [{ enrolledAt: "desc" }, { id: "desc" }], skip, take: pageSize }),
    prisma.enrollment.count({ where }),
  ]);
  if (!enrollments.length) return { rows: [] as InstructorReportRow[], total };
  const userIds = [...new Set(enrollments.map((item) => item.userId))];
  const pageCourseIds = [...new Set(enrollments.map((item) => item.courseId))];
  const [assessments, submissions] = await Promise.all([
    prisma.assessment.findMany({ where: { courseId: { in: pageCourseIds }, createdAt: { gte: cutoff } }, select: { id: true, courseId: true, totalMarks: true, passingMarks: true } }),
    prisma.submission.findMany({ where: { userId: { in: userIds }, submittedAt: { gte: cutoff }, assessment: { courseId: { in: pageCourseIds } } }, select: { userId: true, assessmentId: true, status: true, obtainedMarks: true, assessment: { select: { courseId: true, passingMarks: true } } }, orderBy: [{ submittedAt: "desc" }, { id: "desc" }] }),
  ]);
  const assessmentsByCourse = new Map<string, typeof assessments>();
  for (const item of assessments) assessmentsByCourse.set(item.courseId, [...(assessmentsByCourse.get(item.courseId) ?? []), item]);
  const latest = new Map<string, (typeof submissions)[number]>();
  const submissionCounts = new Map<string, number>();
  for (const item of submissions) { const courseKey = `${item.userId}:${item.assessment.courseId}`; submissionCounts.set(courseKey, (submissionCounts.get(courseKey) ?? 0) + 1); const key = `${item.userId}:${item.assessmentId}`; if (!latest.has(key)) latest.set(key, item); }
  const rows = enrollments.map((enrollment) => {
    const courseAssessments = assessmentsByCourse.get(enrollment.courseId) ?? [];
    const results = courseAssessments.map((assessment) => { const submission = latest.get(`${enrollment.userId}:${assessment.id}`); const graded = Boolean(submission && submission.obtainedMarks !== null && ["GRADED", "REVIEWED"].includes(submission.status)); return { submitted: Boolean(submission), graded, passed: graded ? (submission?.obtainedMarks ?? 0) >= assessment.passingMarks : null, obtained: graded ? submission?.obtainedMarks ?? 0 : 0, total: assessment.totalMarks }; });
    const graded = results.filter((item) => item.graded); const obtained = graded.reduce((sum, item) => sum + item.obtained, 0); const totalMarks = courseAssessments.reduce((sum, item) => sum + item.totalMarks, 0); const passed = results.filter((item) => item.passed === true).length; const failed = results.filter((item) => item.passed === false).length; const pending = courseAssessments.length - graded.length; const scorePercent = totalMarks ? Math.round(obtained / totalMarks * 100) : null; const common = { studentId: enrollment.userId, student: enrollment.user.name, email: enrollment.user.email, courseId: enrollment.courseId, batchIds: enrollment.batchEnrollments.map((item) => item.batchCourse.batchId), course: enrollment.course.title };
    if (report === "student") return { ...common, progress: enrollment.progress, submissions: submissionCounts.get(`${enrollment.userId}:${enrollment.courseId}`) ?? 0, status: enrollment.progress >= 100 ? "Completed" : "In Progress", certificateEligible: enrollment.progress >= 100, scorePercent, passed, failed, pending, risk: enrollment.progress <= 0 ? "Not Started" : failed > 0 || enrollment.progress < 35 ? "At Risk" : enrollment.progress < 70 || pending > 0 ? "Watch" : "On Track" } satisfies AdminStudentReportRow;
    return { ...common, assessmentCount: courseAssessments.length, submittedCount: results.filter((item) => item.submitted).length, gradedCount: graded.length, obtainedMarks: obtained, totalMarks, scorePercent, passedCount: passed, failedCount: failed, pendingCount: pending, courseProgress: enrollment.progress, status: pending > 0 ? "In Progress" : failed > 0 ? "Needs Improvement" : courseAssessments.length ? "Passed" : "No Assessments" } satisfies AdminMarksheetRow;
  });
  return { rows, total };
}

async function listMcqRows(courseIds: string[], cutoff: Date, pageSize: number, skip: number) {
  const where: Prisma.SubmissionWhereInput = { submittedAt: { gte: cutoff }, user: { role: "STUDENT" }, assessment: { courseId: { in: courseIds }, type: "MCQ" } };
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({ where, select: { id: true, assessmentId: true, status: true, obtainedMarks: true, submittedAt: true, answerSheetUrls: true, user: { select: { name: true, email: true } }, assessment: { select: { title: true, courseId: true, totalMarks: true, passingMarks: true, course: { select: { title: true } }, questions: { select: { id: true, correctAnswer: true } } } } }, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], skip, take: pageSize }),
    prisma.submission.count({ where }),
  ]);
  const rows: AdminMcqResultRow[] = submissions.map((item) => { const payload = decodeAssessmentSubmissionPayload(item.answerSheetUrls); const answers = payload?.kind === "MCQ" ? payload.answers ?? {} : {}; const correct = item.assessment.questions.filter((question) => answers[question.id] && answers[question.id] === question.correctAnswer).length; return { id: item.id, assessmentId: item.assessmentId, assessment: item.assessment.title, courseId: item.assessment.courseId, course: item.assessment.course.title, student: item.user.name, email: item.user.email, obtainedMarks: item.obtainedMarks, totalMarks: item.assessment.totalMarks, passingMarks: item.assessment.passingMarks, scorePercent: item.obtainedMarks === null || !item.assessment.totalMarks ? null : Math.round(item.obtainedMarks / item.assessment.totalMarks * 100), passed: item.obtainedMarks === null ? null : item.obtainedMarks >= item.assessment.passingMarks, answered: Object.keys(answers).length, correct, questionCount: item.assessment.questions.length, status: item.status, submittedAt: item.submittedAt?.toISOString() ?? null }; });
  return { rows, total };
}

async function listCertificateRows(courseIds: string[], cutoff: Date, pageSize: number, skip: number) {
  const where: Prisma.CertificateWhereInput = { courseId: { in: courseIds }, issueDate: { gte: cutoff }, user: { role: "STUDENT" } };
  const [items, total] = await Promise.all([prisma.certificate.findMany({ where, select: { id: true, certificateNumber: true, issueDate: true, courseId: true, user: { select: { name: true } }, course: { select: { title: true } } }, orderBy: [{ issueDate: "desc" }, { id: "desc" }], skip, take: pageSize }), prisma.certificate.count({ where })]);
  return { total, rows: items.map((item) => ({ id: item.id, certificateNumber: item.certificateNumber, student: item.user.name, courseId: item.courseId, course: item.course.title, issueDate: item.issueDate.toISOString() })) };
}

export async function getInstructorReportsPage(assignedCourseIds: string[], query: InstructorReportsQuery): Promise<InstructorReportsPayload> {
  const report = VALID_REPORTS.has(query.report) ? query.report : "overview";
  const courseIds = query.courseId && assignedCourseIds.includes(query.courseId) ? [query.courseId] : assignedCourseIds;
  const cutoff = reportCutoff(); const { page, pageSize, skip } = parsePaging(query);
  const [courses, stats, result] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: assignedCourseIds } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    getStats(courseIds, cutoff),
    report === "overview" || report === "course" ? listCourseRows(courseIds, cutoff, page, pageSize, skip)
      : report === "assessment" ? listAssessmentRows(courseIds, query, cutoff, pageSize, skip)
        : report === "marksheet" || report === "student" ? listEnrollmentRows(courseIds, report, cutoff, pageSize, skip)
          : report === "mcq" ? listMcqRows(courseIds, cutoff, pageSize, skip)
            : listCertificateRows(courseIds, cutoff, pageSize, skip),
  ]);
  return { generatedAt: new Date().toISOString(), range: { years: REPORT_YEARS, from: cutoff.toISOString() }, courses, stats, rows: result.rows, pagination: { page, pageSize, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / pageSize)) } };
}
