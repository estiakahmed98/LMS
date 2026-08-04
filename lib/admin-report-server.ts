import { decodeAssessmentSubmissionPayload } from "@/lib/assessment-submission-payload";
import { prisma } from "@/lib/prisma";
import type {
  AdminAssessmentReportRow,
  AdminConsolidatedMarksheet,
  AdminMarksheetRow,
  AdminMcqAnswerSheet,
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
    prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: {
        userId: true,
        courseId: true,
        progress: true,
        course: { select: { title: true } },
        user: { select: { name: true, email: true } },
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
    const risk =
      failed > 0 || enrollment.progress < 35
        ? "At Risk" as const
        : enrollment.progress < 70 || pending > 0
          ? "Watch" as const
          : "On Track" as const;
    return {
      studentId: enrollment.userId,
      student: enrollment.user.name,
      email: enrollment.user.email,
      courseId: enrollment.courseId,
      course: enrollment.course.title,
      progress: enrollment.progress,
      submissions:
        submissionsByUserCourse.get(`${enrollment.userId}:${enrollment.courseId}`)
          ?.length ?? 0,
      status: enrollment.progress >= 100 ? "Completed" : "In Progress",
      certificateEligible: enrollment.progress >= 100,
      scorePercent: marksheet?.scorePercent ?? null,
      passed: marksheet?.passedCount ?? 0,
      failed,
      pending,
      risk,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    courses,
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
