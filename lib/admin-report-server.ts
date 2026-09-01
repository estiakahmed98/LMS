import { learnerActiveAssignmentWhere } from "@/lib/assessment-access-server";
import { decodeAssessmentSubmissionPayload } from "@/lib/assessment-submission-payload";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type {
  AdminAssessmentReportRow,
  AdminConsolidatedMarksheet,
  AdminMarksheetRow,
  AdminMcqAnswerSheet,
  AdminMcqResultRow,
  AdminReportAssessmentType,
  AdminReportsPayload,
  AdminStudentAssessmentRow,
  AdminStudentDirectoryCourseRow,
  AdminStudentDirectoryFilters,
  AdminStudentDirectoryListResult,
  AdminStudentDirectoryRow,
  AdminStudentProfile,
  AdminStudentRisk,
} from "@/lib/admin-report-types";

function pct(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

/**
 * Classifies a learner's standing in a single course.
 *
 * "Not Started" is kept distinct from "At Risk" — a learner who simply
 * hasn't begun the course yet (0% progress, nothing submitted) is not the
 * same signal as one who is actively failing or falling behind.
 */
function classifyRisk(
  progress: number,
  failed: number,
  pending: number,
  submissions: number,
): AdminStudentRisk {
  if (progress <= 0 && submissions === 0) return "Not Started";
  if (failed > 0 || progress < 35) return "At Risk";
  if (progress < 70 || pending > 0) return "Watch";
  return "On Track";
}

const RISK_RANK: Record<AdminStudentRisk, number> = {
  "At Risk": 0,
  Watch: 1,
  "Not Started": 2,
  "On Track": 3,
};

/** Rolls up several per-course risk levels into one overall student risk. */
function worstRisk(risks: AdminStudentRisk[]): AdminStudentRisk {
  if (risks.length === 0) return "Not Started";
  return risks.reduce((worst, risk) =>
    RISK_RANK[risk] < RISK_RANK[worst] ? risk : worst,
  );
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  const guarded = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export async function getAdminReportsPayload(
  courseIds?: string[],
): Promise<AdminReportsPayload> {
  const courseWhere = courseIds ? { id: { in: courseIds } } : {};
  const assessmentWhere = courseIds ? { courseId: { in: courseIds } } : {};
  const submissionWhere = courseIds
    ? { assessment: { courseId: { in: courseIds } } }
    : {};
  const certificateWhere = courseIds ? { courseId: { in: courseIds } } : {};
  const enrollmentWhere = courseIds
    ? {
        status: "APPROVED" as const,
        courseId: { in: courseIds },
        user: { role: "STUDENT" as const },
      }
    : { status: "APPROVED" as const, user: { role: "STUDENT" as const } };

  const [
    courses,
    cohorts,
    approvedEnrollments,
    assessments,
    submissions,
    certificates,
    auditLogs,
    liveClasses,
  ] = await Promise.all([
    prisma.course.findMany({
      where: courseWhere,
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.batch.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: {
        userId: true,
        courseId: true,
        progress: true,
        course: { select: { title: true } },
        user: { select: { name: true, email: true } },
        // Cohort membership for this enrollment — an enrollment can be granted
        // through more than one cohort's course mapping, so this is a list.
        batchEnrollments: {
          select: { batchCourse: { select: { batchId: true } } },
        },
      },
    }),
    prisma.assessment.findMany({
      where: assessmentWhere,
      select: {
        id: true,
        courseId: true,
        title: true,
        type: true,
        totalMarks: true,
        passingMarks: true,
        course: { select: { title: true } },
        questions: {
          select: {
            id: true,
            question: true,
            correctAnswer: true,
            difficulty: true,
            order: true,
          },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.submission.findMany({
      where: {
        ...submissionWhere,
        user: { role: "STUDENT" },
      },
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
              select: {
                id: true,
                question: true,
                correctAnswer: true,
                difficulty: true,
                order: true,
              },
              orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.certificate.findMany({
      where: {
        ...certificateWhere,
        user: { role: "STUDENT" },
      },
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
    prisma.liveClass.findMany({
      where: courseIds ? { courseId: { in: courseIds } } : {},
      select: {
        id: true,
        batchName: true,
        durationMinutes: true,
        courseId: true,
        course: { select: { title: true } },
        instructor: { select: { name: true } },
        sessions: {
          select: {
            status: true,
            attendances: {
              select: { status: true, durationMinutes: true },
            },
          },
        },
      },
    }),
  ]);

  const submissionsByAssessment = new Map<string, typeof submissions>();
  const submissionsByUser = new Map<string, typeof submissions>();
  const submissionsByUserCourse = new Map<string, typeof submissions>();
  const assessmentsByCourse = new Map<string, typeof assessments>();
  for (const submission of submissions) {
    submissionsByAssessment.set(submission.assessmentId, [
      ...(submissionsByAssessment.get(submission.assessmentId) ?? []),
      submission,
    ]);
    submissionsByUser.set(submission.userId, [
      ...(submissionsByUser.get(submission.userId) ?? []),
      submission,
    ]);
    const userCourseKey = `${submission.userId}:${submission.assessment.courseId}`;
    submissionsByUserCourse.set(userCourseKey, [
      ...(submissionsByUserCourse.get(userCourseKey) ?? []),
      submission,
    ]);
  }
  for (const assessment of assessments) {
    assessmentsByCourse.set(assessment.courseId, [
      ...(assessmentsByCourse.get(assessment.courseId) ?? []),
      assessment,
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

  const marksheets: AdminMarksheetRow[] = approvedEnrollments.map((enrollment) => {
    const courseAssessments = assessmentsByCourse.get(enrollment.courseId) ?? [];
    const courseSubmissions =
      submissionsByUserCourse.get(`${enrollment.userId}:${enrollment.courseId}`) ??
      [];
    const submissionByAssessment = new Map<string, (typeof courseSubmissions)[number]>();
    for (const submission of courseSubmissions) {
      // The query is newest-first; keep the learner's latest attempt per assessment.
      if (!submissionByAssessment.has(submission.assessmentId)) {
        submissionByAssessment.set(submission.assessmentId, submission);
      }
    }
    const results = courseAssessments.map((assessment) => {
      const submission = submissionByAssessment.get(assessment.id);
      const isGraded =
        submission?.obtainedMarks !== null &&
        submission !== undefined &&
        (submission.status === "GRADED" || submission.status === "REVIEWED");
      return {
        submitted: Boolean(submission),
        graded: isGraded,
        passed:
          isGraded && submission
            ? (submission.obtainedMarks ?? 0) >= assessment.passingMarks
            : null,
        obtainedMarks: isGraded && submission ? (submission.obtainedMarks ?? 0) : 0,
        totalMarks: assessment.totalMarks,
      };
    });
    const graded = results.filter((result) => result.graded);
    const submittedCount = results.filter((result) => result.submitted).length;
    const obtainedMarks = graded.reduce(
      (sum, result) => sum + result.obtainedMarks,
      0,
    );
    const totalMarks = courseAssessments.reduce(
      (sum, assessment) => sum + assessment.totalMarks,
      0,
    );
    const passedCount = results.filter((result) => result.passed === true).length;
    const failedCount = results.filter((result) => result.passed === false).length;
    const pendingCount = courseAssessments.length - graded.length;
    const scorePercent =
      totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : null;

    return {
      studentId: enrollment.userId,
      courseId: enrollment.courseId,
      batchIds: enrollment.batchEnrollments.map((item) => item.batchCourse.batchId),
      student: enrollment.user.name,
      email: enrollment.user.email,
      course: enrollment.course.title,
      assessmentCount: courseAssessments.length,
      submittedCount,
      gradedCount: graded.length,
      obtainedMarks,
      totalMarks,
      scorePercent,
      passedCount,
      failedCount,
      pendingCount,
      courseProgress: enrollment.progress,
      status:
        pendingCount > 0
          ? "In Progress"
          : failedCount > 0
            ? "Needs Improvement"
            : courseAssessments.length > 0
              ? "Passed"
              : "No Assessments",
    };
  });

  const questionAnalytics = assessments
    .filter((assessment) => assessment.type === "MCQ")
    .flatMap((assessment) => {
      const assessmentSubmissions = submissionsByAssessment.get(assessment.id) ?? [];
      return assessment.questions.map((question, index) => {
        let correct = 0;
        let wrong = 0;
        let unanswered = 0;

        for (const submission of assessmentSubmissions) {
          const payload = decodeAssessmentSubmissionPayload(submission.answerSheetUrls);
          const answers = payload?.kind === "MCQ" ? (payload.answers ?? {}) : {};
          const answer = answers[question.id];
          if (!answer) unanswered += 1;
          else if (question.correctAnswer !== null && answer === question.correctAnswer) {
            correct += 1;
          } else wrong += 1;
        }

        const attempts = assessmentSubmissions.length;
        return {
          questionId: question.id,
          questionNumber: index + 1,
          question: question.question,
          assessmentId: assessment.id,
          assessment: assessment.title,
          courseId: assessment.courseId,
          course: assessment.course.title,
          difficulty: question.difficulty,
          attempts,
          correct,
          wrong,
          unanswered,
          accuracyRate: pct(correct, attempts),
          errorRate: pct(wrong + unanswered, attempts),
        };
      });
    })
    .sort((a, b) => b.errorRate - a.errorRate || b.attempts - a.attempts);

  const batchesByKey = new Map<string, typeof liveClasses>();
  for (const liveClass of liveClasses) {
    const key = `${liveClass.courseId}:${liveClass.batchName || "Unassigned"}`;
    batchesByKey.set(key, [...(batchesByKey.get(key) ?? []), liveClass]);
  }
  const batchRows = [...batchesByKey.entries()].map(([id, classes]) => {
    const sessions = classes.flatMap((item) => item.sessions);
    const attendance = sessions.flatMap((session) => session.attendances);
    const present = attendance.filter((item) => item.status === "PRESENT").length;
    const late = attendance.filter((item) => item.status === "LATE").length;
    const absent = attendance.filter((item) => item.status === "ABSENT").length;
    const durations = attendance
      .map((item) => item.durationMinutes)
      .filter((value): value is number => value !== null);
    return {
      id,
      batch: classes[0]?.batchName || "Unassigned",
      courseId: classes[0]?.courseId ?? "",
      course: classes[0]?.course.title ?? "-",
      instructors: [...new Set(classes.map((item) => item.instructor.name))],
      classes: sessions.length,
      completedClasses: sessions.filter((item) => item.status === "COMPLETED").length,
      attendanceRecords: attendance.length,
      present,
      absent,
      late,
      attendanceRate: pct(present + late, attendance.length),
      averageDurationMinutes: average(durations),
    };
  });

  const gradedSubmissions = submissions.filter(
    (item) =>
      item.obtainedMarks !== null &&
      (item.status === "GRADED" || item.status === "REVIEWED"),
  );
  const passedSubmissions = gradedSubmissions.filter(
    (item) => (item.obtainedMarks ?? 0) >= item.assessment.passingMarks,
  );
  const uniqueStudents = new Set(approvedEnrollments.map((item) => item.userId));
  const allAttendance = liveClasses.flatMap((item) =>
    item.sessions.flatMap((session) => session.attendances),
  );
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    return date;
  });
  const trends = trendMonths.map((start) => {
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const monthly = submissions.filter((item) => {
      const submittedAt = item.submittedAt;
      return submittedAt !== null && submittedAt >= start && submittedAt < end;
    });
    const monthlyGraded = monthly.filter(
      (item) =>
        item.obtainedMarks !== null &&
        (item.status === "GRADED" || item.status === "REVIEWED"),
    );
    return {
      month: start.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
      submissions: monthly.length,
      passRate: pct(
        monthlyGraded.filter(
          (item) => (item.obtainedMarks ?? 0) >= item.assessment.passingMarks,
        ).length,
        monthlyGraded.length,
      ),
    };
  });

  const studentRows = approvedEnrollments.map((enrollment) => {
    const marksheet = marksheets.find(
      (row) => row.studentId === enrollment.userId && row.courseId === enrollment.courseId,
    );
    const failed = marksheet?.failedCount ?? 0;
    const pending = marksheet?.pendingCount ?? 0;
    const submissionCount =
      submissionsByUserCourse.get(`${enrollment.userId}:${enrollment.courseId}`)
        ?.length ?? 0;
    const risk = classifyRisk(
      enrollment.progress,
      failed,
      pending,
      submissionCount,
    );
    return {
      studentId: enrollment.userId,
      student: enrollment.user.name,
      email: enrollment.user.email,
      courseId: enrollment.courseId,
      batchIds: enrollment.batchEnrollments.map((item) => item.batchCourse.batchId),
      course: enrollment.course.title,
      progress: enrollment.progress,
      submissions: submissionCount,
      status: enrollment.progress >= 100 ? "Completed" : "In Progress",
      certificateEligible: enrollment.progress >= 100,
      scorePercent: marksheet?.scorePercent ?? null,
      passed: marksheet?.passedCount ?? 0,
      failed,
      pending,
      risk,
    };
  });

  const certificatesByStudent = new Map<string, number>();
  for (const certificate of certificates) {
    const key = certificate.user.name;
    certificatesByStudent.set(key, (certificatesByStudent.get(key) ?? 0) + 1);
  }

  const studentDirectoryByStudent = new Map<string, AdminStudentDirectoryRow>();
  for (const row of studentRows) {
    const perCourseRow: AdminStudentDirectoryCourseRow = {
      courseId: row.courseId,
      batchIds: row.batchIds,
      course: row.course,
      progress: row.progress,
      scorePercent: row.scorePercent,
      passed: row.passed,
      failed: row.failed,
      pending: row.pending,
      status: row.status,
      risk: row.risk,
    };
    const existing = studentDirectoryByStudent.get(row.studentId);
    if (existing) {
      existing.perCourse.push(perCourseRow);
    } else {
      studentDirectoryByStudent.set(row.studentId, {
        studentId: row.studentId,
        student: row.student,
        email: row.email,
        courseCount: 0,
        courses: [],
        avgProgress: 0,
        scorePercent: null,
        passed: 0,
        failed: 0,
        pending: 0,
        certificatesEarned: certificatesByStudent.get(row.student) ?? 0,
        risk: "Not Started",
        perCourse: [perCourseRow],
      });
    }
  }

  const studentDirectory: AdminStudentDirectoryRow[] = [
    ...studentDirectoryByStudent.values(),
  ]
    .map((entry) => {
      const scored = entry.perCourse.filter((row) => row.scorePercent !== null);
      return {
        ...entry,
        courseCount: entry.perCourse.length,
        courses: entry.perCourse.map((row) => row.course),
        avgProgress: average(entry.perCourse.map((row) => row.progress)),
        scorePercent: scored.length
          ? average(scored.map((row) => row.scorePercent ?? 0))
          : null,
        passed: entry.perCourse.reduce((sum, row) => sum + row.passed, 0),
        failed: entry.perCourse.reduce((sum, row) => sum + row.failed, 0),
        pending: entry.perCourse.reduce((sum, row) => sum + row.pending, 0),
        risk: worstRisk(entry.perCourse.map((row) => row.risk)),
      };
    })
    .sort((a, b) => a.student.localeCompare(b.student));

  return {
    generatedAt: new Date().toISOString(),
    courses,
    cohorts,
    trends,
    stats: {
      totalStudents: uniqueStudents.size,
      totalAssessments: assessments.length,
      totalSubmissions: submissions.length,
      totalCertificates: certificates.length,
      passRate: pct(passedSubmissions.length, gradedSubmissions.length),
      failRate: pct(
        gradedSubmissions.length - passedSubmissions.length,
        gradedSubmissions.length,
      ),
      completionRate: pct(
        approvedEnrollments.filter((item) => item.progress >= 100).length,
        approvedEnrollments.length,
      ),
      averageScore: average(
        gradedSubmissions.map((item) =>
          item.assessment.totalMarks > 0
            ? Math.round(((item.obtainedMarks ?? 0) / item.assessment.totalMarks) * 100)
            : 0,
        ),
      ),
      atRiskStudents: new Set(
        studentRows.filter((item) => item.risk === "At Risk").map((item) => item.studentId),
      ).size,
      gradingBacklog: submissions.filter(
        (item) => item.status === "SUBMITTED" || item.status === "GRADING",
      ).length,
      attendanceRate: pct(
        allAttendance.filter((item) => item.status !== "ABSENT").length,
        allAttendance.length,
      ),
    },
    rows: {
      courses: courseRows,
      assessments: assessmentRows,
      marksheets,
      mcqResults,
      questionAnalytics,
      batches: batchRows,
      students: studentRows,
      studentDirectory,
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

export async function exportAdminReportCsv(
  reportType: string,
  courseIds?: string[],
): Promise<string> {
  const payload = await getAdminReportsPayload(courseIds);

  const rowsByType = {
    overview: payload.rows.courses,
    course: payload.rows.courses,
    assessment: payload.rows.assessments,
    marksheet: payload.rows.marksheets,
    mcq: payload.rows.mcqResults,
    question: payload.rows.questionAnalytics,
    batch: payload.rows.batches,
    student: payload.rows.studentDirectory.map((row) => ({
      studentId: row.studentId,
      student: row.student,
      email: row.email,
      courseCount: row.courseCount,
      courses: row.courses.join("; "),
      avgProgress: row.avgProgress,
      scorePercent: row.scorePercent,
      passed: row.passed,
      failed: row.failed,
      pending: row.pending,
      certificatesEarned: row.certificatesEarned,
      risk: row.risk,
    })),
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

/**
 * Paginated, DB-driven version of the student directory used by the
 * "Individual Student Reports" tab. Unlike getAdminReportsPayload (which
 * scans every enrollment/submission/certificate in the org to build its
 * mega-payload), this only pages through Users and then aggregates
 * enrollments/submissions/certificates for that one page of student IDs —
 * so response time stays flat as the student base grows into the tens or
 * hundreds of thousands.
 */
export async function listStudentDirectory(
  filters: AdminStudentDirectoryFilters = {},
): Promise<AdminStudentDirectoryListResult> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize =
    filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;

  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    ...(filters.search?.trim()
      ? {
          OR: [
            { name: { contains: filters.search.trim(), mode: "insensitive" } },
            { email: { contains: filters.search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filters.courseId || filters.batchId
      ? {
          enrollments: {
            some: {
              status: "APPROVED",
              ...(filters.courseId ? { courseId: filters.courseId } : {}),
              ...(filters.batchId
                ? { batchEnrollments: { some: { batchCourse: { batchId: filters.batchId } } } }
                : {}),
            },
          },
        }
      : {}),
  };

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  if (students.length === 0) {
    return { students: [], total, page, pageSize };
  }

  const studentIds = students.map((student) => student.id);

  const [enrollments, submissions, certificateCounts] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        userId: { in: studentIds },
        status: "APPROVED",
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
        ...(filters.batchId
          ? { batchEnrollments: { some: { batchCourse: { batchId: filters.batchId } } } }
          : {}),
      },
      select: {
        userId: true,
        courseId: true,
        progress: true,
        course: {
          select: {
            title: true,
            assessments: { select: { id: true, totalMarks: true, passingMarks: true } },
          },
        },
        batchEnrollments: {
          select: { batchCourse: { select: { batchId: true } } },
        },
      },
    }),
    prisma.submission.findMany({
      where: {
        userId: { in: studentIds },
        assessment: filters.courseId ? { courseId: filters.courseId } : undefined,
      },
      select: {
        userId: true,
        assessmentId: true,
        obtainedMarks: true,
        status: true,
        assessment: { select: { courseId: true, passingMarks: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.certificate.groupBy({
      by: ["userId"],
      where: { userId: { in: studentIds } },
      _count: { _all: true },
    }),
  ]);

  const certificatesByStudent = new Map(
    certificateCounts.map((row) => [row.userId, row._count._all]),
  );

  const submissionsByStudentCourse = new Map<string, typeof submissions>();
  for (const submission of submissions) {
    const key = `${submission.userId}:${submission.assessment.courseId}`;
    submissionsByStudentCourse.set(key, [
      ...(submissionsByStudentCourse.get(key) ?? []),
      submission,
    ]);
  }

  const enrollmentsByStudent = new Map<string, typeof enrollments>();
  for (const enrollment of enrollments) {
    enrollmentsByStudent.set(enrollment.userId, [
      ...(enrollmentsByStudent.get(enrollment.userId) ?? []),
      enrollment,
    ]);
  }

  const directory: AdminStudentDirectoryRow[] = students.map((student) => {
    const studentEnrollments = enrollmentsByStudent.get(student.id) ?? [];

    const perCourse: AdminStudentDirectoryCourseRow[] = studentEnrollments.map(
      (enrollment) => {
        const courseSubmissions =
          submissionsByStudentCourse.get(`${student.id}:${enrollment.courseId}`) ?? [];
        const byAssessment = new Map<string, (typeof courseSubmissions)[number]>();
        for (const submission of courseSubmissions) {
          if (!byAssessment.has(submission.assessmentId)) {
            byAssessment.set(submission.assessmentId, submission);
          }
        }
        const results = enrollment.course.assessments.map((assessment) => {
          const submission = byAssessment.get(assessment.id);
          const isGraded =
            submission !== undefined &&
            submission.obtainedMarks !== null &&
            (submission.status === "GRADED" || submission.status === "REVIEWED");
          return {
            submitted: Boolean(submission),
            graded: isGraded,
            passed: isGraded && submission ? (submission.obtainedMarks ?? 0) >= assessment.passingMarks : null,
            obtainedMarks: isGraded && submission ? (submission.obtainedMarks ?? 0) : 0,
            totalMarks: assessment.totalMarks,
          };
        });
        const graded = results.filter((result) => result.graded);
        const obtainedMarks = graded.reduce((sum, result) => sum + result.obtainedMarks, 0);
        const totalMarks = enrollment.course.assessments.reduce(
          (sum, assessment) => sum + assessment.totalMarks,
          0,
        );
        const passed = results.filter((result) => result.passed === true).length;
        const failed = results.filter((result) => result.passed === false).length;
        const pending = enrollment.course.assessments.length - graded.length;
        const scorePercent = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : null;

        return {
          courseId: enrollment.courseId,
          batchIds: enrollment.batchEnrollments.map((item) => item.batchCourse.batchId),
          course: enrollment.course.title,
          progress: enrollment.progress,
          scorePercent,
          passed,
          failed,
          pending,
          status:
            pending > 0
              ? "In Progress"
              : failed > 0
                ? "Needs Improvement"
                : enrollment.course.assessments.length > 0
                  ? "Passed"
                  : "No Assessments",
          risk: classifyRisk(enrollment.progress, failed, pending, courseSubmissions.length),
        };
      },
    );

    const scored = perCourse.filter((row) => row.scorePercent !== null);

    return {
      studentId: student.id,
      student: student.name,
      email: student.email,
      courseCount: perCourse.length,
      courses: perCourse.map((row) => row.course),
      avgProgress: average(perCourse.map((row) => row.progress)),
      scorePercent: scored.length ? average(scored.map((row) => row.scorePercent ?? 0)) : null,
      passed: perCourse.reduce((sum, row) => sum + row.passed, 0),
      failed: perCourse.reduce((sum, row) => sum + row.failed, 0),
      pending: perCourse.reduce((sum, row) => sum + row.pending, 0),
      certificatesEarned: certificatesByStudent.get(student.id) ?? 0,
      risk: worstRisk(perCourse.map((row) => row.risk)),
      perCourse,
    };
  });

  return { students: directory, total, page, pageSize };
}

/**
 * One student, every course they're approved in, with a per-course
 * breakdown — the drill-down target for the "Individual Student Reports"
 * directory, which lists each student once instead of once per course.
 */
export async function getStudentProfile(
  studentId: string,
  courseIds?: string[],
): Promise<AdminStudentProfile | null> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: studentId,
      status: "APPROVED",
      user: { role: "STUDENT" },
      ...(courseIds ? { courseId: { in: courseIds } } : {}),
    },
    select: {
      courseId: true,
      progress: true,
      user: { select: { name: true, email: true } },
      course: { select: { id: true, title: true } },
      batchEnrollments: {
        select: { batchCourse: { select: { batchId: true } } },
      },
    },
  });

  if (enrollments.length === 0) return null;

  const courseIdList = enrollments.map((item) => item.courseId);

  const [assessments, submissions, certificateCount] = await Promise.all([
    // Only assessments actually published and visible to this learner —
    // drafts and assignments targeting other batches/learners are excluded.
    prisma.assessment.findMany({
      where: {
        courseId: { in: courseIdList },
        assignments: { some: learnerActiveAssignmentWhere(studentId) },
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        type: true,
        totalMarks: true,
        passingMarks: true,
      },
      orderBy: [{ createdAt: "asc" }, { title: "asc" }],
    }),
    prisma.submission.findMany({
      where: {
        userId: studentId,
        user: { role: "STUDENT" },
        assessment: { courseId: { in: courseIdList } },
      },
      select: {
        assessmentId: true,
        status: true,
        obtainedMarks: true,
        submittedAt: true,
      },
    }),
    prisma.certificate.count({
      where: {
        userId: studentId,
        ...(courseIds ? { courseId: { in: courseIds } } : {}),
      },
    }),
  ]);

  const assessmentsByCourse = new Map<string, typeof assessments>();
  for (const assessment of assessments) {
    assessmentsByCourse.set(assessment.courseId, [
      ...(assessmentsByCourse.get(assessment.courseId) ?? []),
      assessment,
    ]);
  }
  const submissionByAssessment = new Map(
    submissions.map((submission) => [submission.assessmentId, submission]),
  );

  const assessmentRows: AdminStudentAssessmentRow[] = [];
  const courses: AdminStudentDirectoryCourseRow[] = [];

  for (const enrollment of enrollments) {
    const courseAssessments = assessmentsByCourse.get(enrollment.courseId) ?? [];
    // A course with no published assessments has nothing gradeable to show
    // in this report yet, so it's left out of the per-course breakdown too.
    if (courseAssessments.length === 0) continue;

    const results = courseAssessments.map((assessment) => {
      const submission = submissionByAssessment.get(assessment.id);
      const graded =
        submission?.obtainedMarks !== null &&
        submission !== undefined &&
        (submission.status === "GRADED" || submission.status === "REVIEWED");
      const scorePercent =
        graded && assessment.totalMarks > 0
          ? Math.round(((submission?.obtainedMarks ?? 0) / assessment.totalMarks) * 100)
          : null;

      assessmentRows.push({
        assessmentId: assessment.id,
        assessment: assessment.title,
        courseId: assessment.courseId,
        course: enrollment.course.title,
        type: assessment.type as AdminReportAssessmentType,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
        obtainedMarks: graded ? (submission?.obtainedMarks ?? 0) : null,
        scorePercent,
        passed: graded
          ? (submission?.obtainedMarks ?? 0) >= assessment.passingMarks
          : null,
        status: submission?.status ?? "NOT_SUBMITTED",
        submittedAt: submission?.submittedAt?.toISOString() ?? null,
      });

      return {
        graded,
        submitted: Boolean(submission),
        passed: graded && submission
          ? (submission.obtainedMarks ?? 0) >= assessment.passingMarks
          : null,
        obtainedMarks: graded && submission ? (submission.obtainedMarks ?? 0) : 0,
        totalMarks: assessment.totalMarks,
      };
    });
    const graded = results.filter((result) => result.graded);
    const obtainedMarks = graded.reduce((sum, result) => sum + result.obtainedMarks, 0);
    const totalMarks = courseAssessments.reduce(
      (sum, assessment) => sum + assessment.totalMarks,
      0,
    );
    const passed = results.filter((result) => result.passed === true).length;
    const failed = results.filter((result) => result.passed === false).length;
    const pending = courseAssessments.length - graded.length;
    const submissionCount = results.filter((result) => result.submitted).length;
    const scorePercent = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : null;
    const risk = classifyRisk(enrollment.progress, failed, pending, submissionCount);

    courses.push({
      courseId: enrollment.courseId,
      batchIds: enrollment.batchEnrollments.map((item) => item.batchCourse.batchId),
      course: enrollment.course.title,
      progress: enrollment.progress,
      scorePercent,
      passed,
      failed,
      pending,
      status: enrollment.progress >= 100 ? "Completed" : "In Progress",
      risk,
    });
  }

  const scored = courses.filter((row) => row.scorePercent !== null);
  const first = enrollments[0];

  return {
    studentId,
    student: first.user.name,
    email: first.user.email,
    generatedAt: new Date().toISOString(),
    summary: {
      courseCount: courses.length,
      avgProgress: average(courses.map((row) => row.progress)),
      scorePercent: scored.length
        ? average(scored.map((row) => row.scorePercent ?? 0))
        : null,
      passed: courses.reduce((sum, row) => sum + row.passed, 0),
      failed: courses.reduce((sum, row) => sum + row.failed, 0),
      pending: courses.reduce((sum, row) => sum + row.pending, 0),
      certificatesEarned: certificateCount,
      risk: worstRisk(courses.map((row) => row.risk)),
    },
    courses,
    assessments: assessmentRows,
  };
}

export async function getConsolidatedMarksheet(
  studentId: string,
  courseId: string,
  courseIds?: string[],
): Promise<AdminConsolidatedMarksheet | null> {
  if (courseIds && !courseIds.includes(courseId)) return null;

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: studentId,
      courseId,
      status: "APPROVED",
      user: { role: "STUDENT" },
    },
    select: {
      progress: true,
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
  });

  if (!enrollment) return null;

  const [assessments, submissions] = await Promise.all([
    prisma.assessment.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        type: true,
        totalMarks: true,
        passingMarks: true,
      },
      orderBy: [{ createdAt: "asc" }, { title: "asc" }],
    }),
    prisma.submission.findMany({
      where: {
        userId: studentId,
        assessment: { courseId },
        user: { role: "STUDENT" },
      },
      select: {
        assessmentId: true,
        status: true,
        obtainedMarks: true,
        submittedAt: true,
      },
    }),
  ]);

  const submissionByAssessment = new Map(
    submissions.map((submission) => [submission.assessmentId, submission]),
  );

  const assessmentResults = assessments.map((assessment) => {
    const submission = submissionByAssessment.get(assessment.id);
    const graded =
      submission?.obtainedMarks !== null &&
      submission !== undefined &&
      (submission.status === "GRADED" || submission.status === "REVIEWED");
    const scorePercent =
      graded && assessment.totalMarks > 0
        ? Math.round(((submission?.obtainedMarks ?? 0) / assessment.totalMarks) * 100)
        : null;

    return {
      assessmentId: assessment.id,
      title: assessment.title,
      type: assessment.type as AdminReportAssessmentType,
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      obtainedMarks: graded ? (submission?.obtainedMarks ?? 0) : null,
      scorePercent,
      passed: graded
        ? (submission?.obtainedMarks ?? 0) >= assessment.passingMarks
        : null,
      status: submission?.status ?? "NOT_SUBMITTED",
      submittedAt: submission?.submittedAt?.toISOString() ?? null,
    };
  });

  const graded = assessmentResults.filter((result) => result.obtainedMarks !== null);
  const obtainedMarks = graded.reduce(
    (sum, result) => sum + (result.obtainedMarks ?? 0),
    0,
  );
  const totalMarks = assessments.reduce(
    (sum, assessment) => sum + assessment.totalMarks,
    0,
  );
  const passedCount = assessmentResults.filter((result) => result.passed === true).length;
  const failedCount = assessmentResults.filter((result) => result.passed === false).length;
  const pendingCount = assessments.length - graded.length;
  const scorePercent =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : null;

  return {
    studentId,
    courseId,
    student: enrollment.user.name,
    email: enrollment.user.email,
    course: enrollment.course.title,
    courseProgress: enrollment.progress,
    generatedAt: new Date().toISOString(),
    summary: {
      assessmentCount: assessments.length,
      submittedCount: assessmentResults.filter((result) => result.status !== "NOT_SUBMITTED").length,
      gradedCount: graded.length,
      obtainedMarks,
      totalMarks,
      scorePercent,
      passedCount,
      failedCount,
      pendingCount,
      result:
        pendingCount > 0
          ? "In Progress"
          : failedCount > 0
            ? "Needs Improvement"
            : assessments.length > 0
              ? "Passed"
              : "No Assessments",
    },
    assessments: assessmentResults,
  };
}

export async function getAdminMcqAnswerSheet(
  submissionId: string,
  courseIds?: string[],
): Promise<AdminMcqAnswerSheet | null> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      assessmentId: true,
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
            select: {
              id: true,
              question: true,
              options: true,
              correctAnswer: true,
              marks: true,
            },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!submission || submission.assessment.type !== "MCQ") return null;
  if (courseIds && !courseIds.includes(submission.assessment.courseId)) {
    return null;
  }

  const payload = decodeAssessmentSubmissionPayload(submission.answerSheetUrls);
  const answers = payload?.kind === "MCQ" ? (payload.answers ?? {}) : {};
  const questions = submission.assessment.questions.map((question) => {
    const selectedAnswer = answers[question.id] ?? null;
    const isCorrect =
      selectedAnswer !== null &&
      question.correctAnswer !== null &&
      selectedAnswer === question.correctAnswer;

    return {
      id: question.id,
      question: question.question,
      options: question.options,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      marks: question.marks,
      awardedMarks: isCorrect ? question.marks : 0,
    };
  });

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
    correct: questions.filter((question) => question.isCorrect).length,
    questionCount: questions.length,
    status: submission.status,
    submittedAt: submission.submittedAt?.toISOString() ?? null,
    questions,
  };
}
