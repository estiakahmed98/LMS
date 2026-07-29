import { prisma } from "@/lib/prisma";
import {
  AssessmentType,
  EnrollmentStatus,
  PermissionModule,
  SubmissionStatus,
} from "@/lib/generated/prisma/enums";
import type { PermissionAction } from "@/lib/rbac";
import {
  LearnerAuthError,
  requireApprovedEnrollment,
  requireLearner,
} from "@/lib/learner-auth-server";
import {
  decodeAssessmentSubmissionPayload,
  encodeAssessmentSubmissionPayload,
} from "@/lib/assessment-submission-payload";
import type {
  LearnerAssessmentDetail,
  LearnerAssessmentListItem,
  LearnerAssessmentResultItem,
  LearnerAssessmentSubmission,
  LearnerAssessmentSubmissionPayload,
  LearnerAssessmentSubmissionReviewItem,
} from "@/lib/learner-assessment-types";

export class LearnerAssessmentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LearnerAssessmentError";
    this.status = status;
  }
}

export function isLearnerSubmissionPendingScore(submission: {
  status: SubmissionStatus;
  obtainedMarks: number | null;
}) {
  return (
    submission.obtainedMarks === null ||
    (submission.status !== SubmissionStatus.GRADED &&
      submission.status !== SubmissionStatus.REVIEWED)
  );
}

export async function requireLearnerAccount(
  action: PermissionAction = "view",
) {
  try {
    return await requireLearner("/assessments", {
      module: PermissionModule.ASSESSMENTS,
      action,
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      throw new LearnerAssessmentError(error.message, error.status);
    }
    throw error;
  }
}

function serializeSubmission(row: {
  id: string;
  status: SubmissionStatus;
  manualReviewStatus:
    | "NOT_REQUIRED"
    | "PENDING_MAKER"
    | "MAKER_DRAFT"
    | "PENDING_CHECKER"
    | "RETURNED_TO_MAKER"
    | "FINALIZED";
  obtainedMarks: number | null;
  submittedAt: Date | null;
  makerComment: string | null;
  checkerComment: string | null;
  returnReason: string | null;
  makerMarkedAt: Date | null;
  makerSubmittedAt: Date | null;
  checkedAt: Date | null;
  answerSheetUrls: string[];
  assessment: {
    questions: {
      id: string;
      question: string;
      correctAnswer: string | null;
      marks: number;
    }[];
  };
  questionGrades?: {
    questionId: string;
    makerMarks: number | null;
    makerComment: string | null;
    checkerMarks: number | null;
    checkerComment: string | null;
  }[];
}): LearnerAssessmentSubmission {
  const payload = decodeAssessmentSubmissionPayload(row.answerSheetUrls);
  const review: LearnerAssessmentSubmissionReviewItem[] = [];
  const gradeByQuestionId = new Map(
    (row.questionGrades ?? []).map((grade) => [grade.questionId, grade]),
  );

  if (payload?.kind === "MCQ" && row.status === SubmissionStatus.GRADED && payload.answers) {
    for (const question of row.assessment.questions) {
      const selectedAnswer = payload.answers[question.id] ?? null;
      const correctAnswer = question.correctAnswer;
      const isCorrect =
        selectedAnswer !== null &&
        correctAnswer !== null &&
        selectedAnswer === correctAnswer;

      review.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer,
        correctAnswer,
        isCorrect,
        marks: question.marks,
        finalMarks: isCorrect ? question.marks : 0,
      });
    }
  } else if (
    (payload?.kind === "WRITTEN" || payload?.kind === "PRACTICAL") &&
    (payload.answers || row.assessment.questions.length > 0)
  ) {
    for (const question of row.assessment.questions) {
      const grade = gradeByQuestionId.get(question.id);
      review.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer: payload.answers?.[question.id] ?? null,
        correctAnswer: null,
        isCorrect: false,
        marks: question.marks,
        makerMarks: grade?.makerMarks ?? null,
        checkerMarks: grade?.checkerMarks ?? null,
        finalMarks: grade?.checkerMarks ?? grade?.makerMarks ?? null,
        makerComment: grade?.makerComment ?? null,
        checkerComment: grade?.checkerComment ?? null,
      });
    }
  }

  const totalMarks = row.assessment.questions.reduce(
    (sum, question) => sum + question.marks,
    0,
  );
  const scorePercent =
    row.obtainedMarks !== null && totalMarks > 0
      ? Math.round((row.obtainedMarks / totalMarks) * 100)
      : null;

  return {
    id: row.id,
    status: row.status,
    manualReviewStatus: row.manualReviewStatus,
    obtainedMarks: row.obtainedMarks,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    scorePercent,
    passed: null,
    payload,
    feedback: {
      makerComment: row.makerComment,
      checkerComment: row.checkerComment,
      returnReason: row.returnReason,
      makerMarkedAt: row.makerMarkedAt?.toISOString() ?? null,
      makerSubmittedAt: row.makerSubmittedAt?.toISOString() ?? null,
      checkedAt: row.checkedAt?.toISOString() ?? null,
    },
    review,
  };
}

export async function getLearnerAssessmentList(learnerId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: learnerId,
      status: EnrollmentStatus.APPROVED,
    },
    select: {
      courseId: true,
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const courseIds = [...new Set(enrollments.map((enrollment) => enrollment.courseId))];

  if (courseIds.length === 0) {
    return { assessments: [] as LearnerAssessmentListItem[] };
  }

  const assessments = await prisma.assessment.findMany({
    where: {
      courseId: {
        in: courseIds,
      },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      questions: {
        select: {
          id: true,
        },
      },
      submissions: {
        where: {
          userId: learnerId,
        },
        select: {
          id: true,
          status: true,
          manualReviewStatus: true,
          obtainedMarks: true,
          submittedAt: true,
          makerComment: true,
          checkerComment: true,
          returnReason: true,
          makerMarkedAt: true,
          makerSubmittedAt: true,
          checkedAt: true,
          answerSheetUrls: true,
          assessment: {
            select: {
              questions: {
                select: {
                  id: true,
                  question: true,
                  correctAnswer: true,
                  marks: true,
                },
              },
            },
          },
          questionGrades: {
            select: {
              questionId: true,
              makerMarks: true,
              makerComment: true,
              checkerMarks: true,
              checkerComment: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const serializedAssessments = assessments
    .slice()
    .sort((a, b) => a.course.title.localeCompare(b.course.title))
    .map((assessment) => ({
      id: assessment.id,
      title: assessment.title,
      type: assessment.type as LearnerAssessmentListItem["type"],
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      questionCount: assessment.questions.length,
      course: {
        id: assessment.course.id,
        title: assessment.course.title,
      },
      submission: assessment.submissions[0]
        ? serializeSubmission({
            ...assessment.submissions[0],
            assessment: assessment.submissions[0].assessment,
          })
        : null,
    }));

  return {
    assessments: serializedAssessments,
  };
}

export async function getLearnerAssessmentResults(learnerId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: learnerId,
      status: EnrollmentStatus.APPROVED,
    },
    select: {
      courseId: true,
    },
  });

  const courseIds = [...new Set(enrollments.map((item) => item.courseId))];

  if (courseIds.length === 0) {
    return { results: [] as LearnerAssessmentResultItem[] };
  }

  const submissions = await prisma.submission.findMany({
    where: {
      userId: learnerId,
      assessment: {
        courseId: {
          in: courseIds,
        },
      },
    },
    select: {
      id: true,
      assessmentId: true,
      status: true,
      manualReviewStatus: true,
      obtainedMarks: true,
      submittedAt: true,
      assessment: {
        select: {
          title: true,
          type: true,
          totalMarks: true,
          passingMarks: true,
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: [
      { assessment: { course: { title: "asc" } } },
      { submittedAt: "desc" },
    ],
  });

  const results = submissions.map((submission) => {
    const totalMarks = submission.assessment.totalMarks;
    const scorePercent =
      submission.obtainedMarks !== null && totalMarks > 0
        ? Math.round((submission.obtainedMarks / totalMarks) * 100)
        : null;

    return {
      id: submission.id,
      assessmentId: submission.assessmentId,
      assessmentTitle: submission.assessment.title,
      assessmentType: submission.assessment.type,
      course: submission.assessment.course,
      status: submission.status,
      manualReviewStatus: submission.manualReviewStatus,
      obtainedMarks: submission.obtainedMarks,
      totalMarks,
      passingMarks: submission.assessment.passingMarks,
      scorePercent,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
    } satisfies LearnerAssessmentResultItem;
  });

  return { results };
}

export async function getLearnerAssessmentDetail(
  learnerId: string,
  assessmentId: string,
  submissionId?: string,
): Promise<LearnerAssessmentDetail> {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
      questions: {
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          question: true,
          type: true,
          marks: true,
          options: true,
        },
      },
    },
  });

  if (!assessment) {
    throw new LearnerAssessmentError("Assessment not found.", 404);
  }

  try {
    await requireApprovedEnrollment(learnerId, assessment.courseId);
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      throw new LearnerAssessmentError(error.message, error.status);
    }
    throw error;
  }

  const submission = await prisma.submission.findFirst({
    where: {
      userId: learnerId,
      assessmentId: assessment.id,
      ...(submissionId ? { id: submissionId } : {}),
    },
    include: {
      assessment: {
        select: {
          questions: {
            select: {
              id: true,
              question: true,
              correctAnswer: true,
              marks: true,
            },
          },
        },
      },
      questionGrades: {
        select: {
          questionId: true,
          makerMarks: true,
          makerComment: true,
          checkerMarks: true,
          checkerComment: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  return {
    assessment: {
      id: assessment.id,
      title: assessment.title,
      type: assessment.type as LearnerAssessmentDetail["assessment"]["type"],
      totalMarks: assessment.totalMarks,
      passingMarks: assessment.passingMarks,
      course: {
        id: assessment.course.id,
        title: assessment.course.title,
      },
    },
    questions: assessment.questions.map((question) => ({
      id: question.id,
      question: question.question,
      type: question.type,
      marks: question.marks,
      options: question.options,
    })),
    submission: submission
      ? serializeSubmission({
          id: submission.id,
          status: submission.status,
          manualReviewStatus: submission.manualReviewStatus,
          obtainedMarks: submission.obtainedMarks,
          submittedAt: submission.submittedAt,
          makerComment: submission.makerComment,
          checkerComment: submission.checkerComment,
          returnReason: submission.returnReason,
          makerMarkedAt: submission.makerMarkedAt,
          makerSubmittedAt: submission.makerSubmittedAt,
          checkedAt: submission.checkedAt,
          answerSheetUrls: submission.answerSheetUrls,
          assessment: submission.assessment,
          questionGrades: submission.questionGrades,
        })
      : null,
  };
}

export async function submitLearnerAssessment(
  learnerId: string,
  assessmentId: string,
  payload: LearnerAssessmentSubmissionPayload,
) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        select: {
          id: true,
          question: true,
          correctAnswer: true,
          marks: true,
        },
      },
    },
  });

  if (!assessment) {
    throw new LearnerAssessmentError("Assessment not found.", 404);
  }

  try {
    await requireApprovedEnrollment(learnerId, assessment.courseId);
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      throw new LearnerAssessmentError(error.message, error.status);
    }
    throw error;
  }

  const existingSubmission = await prisma.submission.findUnique({
    where: {
      assessmentId_userId: {
        assessmentId,
        userId: learnerId,
      },
    },
    select: {
      status: true,
      obtainedMarks: true,
    },
  });

  if (
    existingSubmission &&
    isLearnerSubmissionPendingScore(existingSubmission)
  ) {
    throw new LearnerAssessmentError(
      "Your previous submission is still pending grading. You can retake this assessment after the score is published.",
      409,
    );
  }

  const totalMarks = assessment.questions.reduce(
    (sum, question) => sum + question.marks,
    0,
  );

  let obtainedMarks: number | null = null;
  let status: SubmissionStatus = SubmissionStatus.SUBMITTED;
  let review: LearnerAssessmentSubmissionReviewItem[] = [];

  if (payload.kind === "MCQ" && payload.answers && Object.keys(payload.answers).length > 0) {
    obtainedMarks = assessment.questions.reduce((sum, question) => {
      const selectedAnswer = payload.answers?.[question.id] ?? null;
      const isCorrect =
        selectedAnswer !== null &&
        question.correctAnswer !== null &&
        selectedAnswer === question.correctAnswer;
      if (isCorrect) {
        review.push({
          questionId: question.id,
          question: question.question,
          selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect: true,
          marks: question.marks,
        });
        return sum + question.marks;
      }

      review.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect: false,
        marks: question.marks,
      });
      return sum;
    }, 0);
    status = SubmissionStatus.GRADED;
  } else {
    review = assessment.questions.map((question) => ({
      questionId: question.id,
      question: question.question,
      selectedAnswer: payload.answers?.[question.id] ?? null,
      correctAnswer: null,
      isCorrect: false,
      marks: question.marks,
    }));
    status = SubmissionStatus.SUBMITTED;
  }

  const submittedAt = new Date();
  const encodedPayload = encodeAssessmentSubmissionPayload(payload);

  const submission = await prisma.submission.upsert({
    where: {
      assessmentId_userId: {
        assessmentId,
        userId: learnerId,
      },
    },
    update: {
      status,
      obtainedMarks,
      submittedAt,
      gradedAt: status === SubmissionStatus.GRADED ? submittedAt : null,
      manualReviewStatus:
        payload.kind === "MCQ" ? "NOT_REQUIRED" : "PENDING_MAKER",
      answerSheetUrls: [encodedPayload],
    },
    create: {
      assessmentId,
      userId: learnerId,
      status,
      obtainedMarks,
      submittedAt,
      gradedAt: status === SubmissionStatus.GRADED ? submittedAt : null,
      manualReviewStatus:
        payload.kind === "MCQ" ? "NOT_REQUIRED" : "PENDING_MAKER",
      answerSheetUrls: [encodedPayload],
    },
    include: {
      assessment: {
        select: {
          questions: {
            select: {
              id: true,
              question: true,
              correctAnswer: true,
              marks: true,
            },
          },
        },
      },
    },
  });

  const scorePercent =
    obtainedMarks !== null && totalMarks > 0
      ? Math.round((obtainedMarks / totalMarks) * 100)
      : null;

  return {
    submission: serializeSubmission(submission),
    scorePercent,
    passingPercent:
      totalMarks > 0 ? Math.round((assessment.passingMarks / totalMarks) * 100) : 0,
    totalMarks,
    passingMarks: assessment.passingMarks,
    assessmentType: assessment.type as AssessmentType,
    review,
  };
}
