import { decodeAssessmentSubmissionPayload } from "@/lib/assessment-submission-payload";
import { prisma } from "@/lib/prisma";
import type {
  AdminAssessmentReportRow,
  AdminMcqResultRow,
  AdminReportAssessmentType,
  AdminReportsPayload,
} from "@/lib/admin-report-types";

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export async function getAdminReportsPayload(): Promise<AdminReportsPayload> {
  const [
    courses,
    approvedEnrollments,
    assessments,
    submissions,
    certificates,
    auditLogs,
  ] = await Promise.all([
    prisma.course.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { status: "APPROVED" },
      select: {
        userId: true,
        courseId: true,
        progress: true,
        course: { select: { title: true } },
        user: { select: { name: true } },
      },
    }),
    prisma.assessment.findMany({
      select: {
        id: true,
        courseId: true,
        title: true,
        type: true,
        totalMarks: true,
        passingMarks: true,
        course: { select: { title: true } },
        questions: {
          select: { id: true, correctAnswer: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.findMany({
      select: {
        id: true,
        assessmentId: true,
        userId: true,
        status: true,
        obtainedMarks: true,
        submittedAt: true,
        answerSheetUrls: true,
        user: { select: { name: true, email: true } },
        assessment: {
          select: {
            id: true,
            courseId: true,
            title: true,
            type: true,
            totalMarks: true,
            passingMarks: true,
            course: { select: { title: true } },
            questions: {
              select: { id: true, correctAnswer: true },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.certificate.findMany({
      select: {
        id: true,
        certificateNumber: true,
        issueDate: true,
        courseId: true,
        course: { select: { title: true } },
        user: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.auditLog.findMany({
      take: 500,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        actorLabel: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const submissionsByAssessment = new Map<string, typeof submissions>();
  const submissionsByUser = new Map<string, typeof submissions>();
  for (const submission of submissions) {
    submissionsByAssessment.set(submission.assessmentId, [
      ...(submissionsByAssessment.get(submission.assessmentId) ?? []),
      submission,
    ]);
    submissionsByUser.set(submission.userId, [
      ...(submissionsByUser.get(submission.userId) ?? []),
      submission,
    ]);
  }

  const courseRows = courses.map((course) => {
    const enrollments = approvedEnrollments.filter(
      (item) => item.courseId === course.id,
    );
    const courseAssessments = assessments.filter(
      (item) => item.courseId === course.id,
    );
    const gradedScores = submissions.filter(
      (item) =>
        item.assessment.courseId === course.id &&
        item.obtainedMarks !== null &&
        (item.status === "GRADED" || item.status === "REVIEWED"),
    );

    return {
      courseId: course.id,
      course: course.title,
      students: enrollments.length,
      assessments: courseAssessments.length,
      completed: enrollments.filter((item) => item.progress >= 100).length,
      avgProgress: average(enrollments.map((item) => item.progress)),
      passRate: pct(
        gradedScores.filter(
          (item) => (item.obtainedMarks ?? 0) >= item.assessment.passingMarks,
        ).length,
        gradedScores.length,
      ),
    };
  });

  const assessmentRows: AdminAssessmentReportRow[] = assessments.map((assessment) => {
    const assessmentSubmissions = submissionsByAssessment.get(assessment.id) ?? [];
    const graded = assessmentSubmissions.filter(
      (item) =>
        item.obtainedMarks !== null &&
        (item.status === "GRADED" || item.status === "REVIEWED"),
    );

    return {
      id: assessment.id,
      assessment: assessment.title,
      courseId: assessment.courseId,
      course: assessment.course.title,
      type: assessment.type as AdminReportAssessmentType,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      submissions: assessmentSubmissions.length,
      pending: assessmentSubmissions.filter(
        (item) => item.status === "SUBMITTED" || item.status === "GRADING",
      ).length,
      avgScore: average(graded.map((item) => item.obtainedMarks ?? 0)),
      passRate: pct(
        graded.filter((item) => (item.obtainedMarks ?? 0) >= assessment.passingMarks)
          .length,
        graded.length,
      ),
    };
  });

  const mcqResults: AdminMcqResultRow[] = submissions
    .filter((submission) => submission.assessment.type === "MCQ")
    .map((submission) => {
      const payload = decodeAssessmentSubmissionPayload(submission.answerSheetUrls);
      const answers = payload?.kind === "MCQ" ? (payload.answers ?? {}) : {};
      const correct = submission.assessment.questions.filter((question) => {
        const selectedAnswer = answers[question.id] ?? null;
        return (
          selectedAnswer !== null &&
          question.correctAnswer !== null &&
          selectedAnswer === question.correctAnswer
        );
      }).length;
      const scorePercent =
        submission.obtainedMarks !== null && submission.assessment.totalMarks > 0
          ? Math.round(
              (submission.obtainedMarks / submission.assessment.totalMarks) * 100,
            )
          : null;

      return {
        id: submission.id,
        assessmentId: submission.assessmentId,
        assessment: submission.assessment.title,
        courseId: submission.assessment.courseId,
        course: submission.assessment.course.title,
        student: submission.user.name,
        email: submission.user.email,
        obtainedMarks: submission.obtainedMarks,
        totalMarks: submission.assessment.totalMarks,
        passingMarks: submission.assessment.passingMarks,
        scorePercent,
        passed:
          submission.obtainedMarks === null
            ? null
            : submission.obtainedMarks >= submission.assessment.passingMarks,
        answered: Object.keys(answers).length,
        correct,
        questionCount: submission.assessment.questions.length,
        status: submission.status,
        submittedAt: submission.submittedAt?.toISOString() ?? null,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    courses,
    stats: {
      totalStudents: approvedEnrollments.length,
      totalAssessments: assessments.length,
      totalSubmissions: submissions.length,
      totalCertificates: certificates.length,
    },
    rows: {
      courses: courseRows,
      assessments: assessmentRows,
      mcqResults,
      students: approvedEnrollments.map((enrollment) => ({
        student: enrollment.user.name,
        courseId: enrollment.courseId,
        course: enrollment.course.title,
        progress: enrollment.progress,
        submissions: submissionsByUser.get(enrollment.userId)?.length ?? 0,
        status: enrollment.progress >= 100 ? "Completed" : "In Progress",
        certificateEligible: enrollment.progress >= 100,
      })),
      certificates: certificates.map((certificate) => ({
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        student: certificate.user.name,
        courseId: certificate.courseId,
        course: certificate.course.title,
        issueDate: certificate.issueDate.toISOString(),
      })),
      audit: auditLogs.map((log) => ({
        id: log.id,
        user: log.user?.name ?? log.actorLabel ?? "System",
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        date: log.createdAt.toISOString(),
      })),
    },
  };
}

export async function exportAdminReportCsv(reportType: string): Promise<string> {
  const payload = await getAdminReportsPayload();

  const rowsByType = {
    overview: payload.rows.courses,
    course: payload.rows.courses,
    assessment: payload.rows.assessments,
    mcq: payload.rows.mcqResults,
    student: payload.rows.students,
    certificate: payload.rows.certificates,
    audit: payload.rows.audit,
  };

  const rows = rowsByType[reportType as keyof typeof rowsByType] ?? payload.rows.courses;
  const headers = rows[0] ? Object.keys(rows[0]) : ["No records"];
  const body = rows.map((row) =>
    headers
      .map((header) =>
        csvCell((row as unknown as Record<string, unknown>)[header]),
      )
      .join(","),
  );

  return [headers.map(csvCell).join(","), ...body].join("\r\n");
}
