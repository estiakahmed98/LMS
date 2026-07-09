import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AssessmentType,
  EnrollmentStatus,
  SubmissionStatus,
} from "@/lib/generated/prisma/enums";
import type {
  LearnerAssessmentDetail,
  LearnerAssessmentListItem,
  LearnerAssessmentSubmission,
  LearnerAssessmentSubmissionPayload,
  LearnerAssessmentSubmissionReviewItem,
} from "@/lib/learner-assessment-types";

const SUBMISSION_PAYLOAD_PREFIX = "assessment-payload:";

export class LearnerAssessmentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LearnerAssessmentError";
    this.status = status;
  }
}

export async function requireLearnerAccount() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    throw new LearnerAssessmentError("You must be signed in.", 401);
  }

  if (user.role !== "STUDENT") {
    throw new LearnerAssessmentError("Learner access required.", 403);
  }

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
  };
}

function encodePayload(payload: LearnerAssessmentSubmissionPayload) {
  return `${SUBMISSION_PAYLOAD_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
}

function decodePayload(answerSheetUrls: string[]): LearnerAssessmentSubmissionPayload | null {
  const encoded = answerSheetUrls[0];
  if (!encoded?.startsWith(SUBMISSION_PAYLOAD_PREFIX)) return null;

  try {
    return JSON.parse(
      decodeURIComponent(encoded.slice(SUBMISSION_PAYLOAD_PREFIX.length)),
    ) as LearnerAssessmentSubmissionPayload;
  } catch {
    return null;
  }
}

function serializeSubmission(row: {
  id: string;
  status: SubmissionStatus;
  obtainedMarks: number | null;
  submittedAt: Date | null;
  answerSheetUrls: string[];
  assessment: {
    questions: {
      id: string;
      question: string;
      correctAnswer: string | null;
      marks: number;
    }[];
  };
}): LearnerAssessmentSubmission {
  const payload = decodePayload(row.answerSheetUrls);
  const review: LearnerAssessmentSubmissionReviewItem[] = [];

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
      });
    }
  } else if (payload?.kind === "WRITTEN" && payload.answers) {
    for (const question of row.assessment.questions) {
      review.push({
        questionId: question.id,
        question: question.question,
        selectedAnswer: payload.answers[question.id] ?? null,
        correctAnswer: null,
        isCorrect: false,
        marks: question.marks,
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
    obtainedMarks: row.obtainedMarks,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    scorePercent,
    passed: null,
    payload,
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
          obtainedMarks: true,
          submittedAt: true,
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

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: learnerId,
        courseId: assessment.courseId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!enrollment) {
    throw new LearnerAssessmentError("You are not enrolled in this course.", 404);
  }

  if (enrollment.status !== EnrollmentStatus.APPROVED) {
    throw new LearnerAssessmentError("Your enrollment is not approved yet.", 403);
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
          obtainedMarks: submission.obtainedMarks,
          submittedAt: submission.submittedAt,
          answerSheetUrls: submission.answerSheetUrls,
          assessment: submission.assessment,
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

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId: learnerId,
        courseId: assessment.courseId,
      },
    },
    select: {
      status: true,
    },
  });

  if (!enrollment) {
    throw new LearnerAssessmentError("You are not enrolled in this course.", 404);
  }

  if (enrollment.status !== EnrollmentStatus.APPROVED) {
    throw new LearnerAssessmentError("Your enrollment is not approved yet.", 403);
  }

  const totalMarks = assessment.questions.reduce(
    (sum, question) => sum + question.marks,
    0,
  );

  let obtainedMarks: number | null = null;
  let status = SubmissionStatus.SUBMITTED;
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
  const encodedPayload = encodePayload(payload);

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
      answerSheetUrls: [encodedPayload],
    },
    create: {
      assessmentId,
      userId: learnerId,
      status,
      obtainedMarks,
      submittedAt,
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
    submission: serializeSubmission({
      id: submission.id,
      status: submission.status,
      obtainedMarks: submission.obtainedMarks,
      submittedAt: submission.submittedAt,
      answerSheetUrls: submission.answerSheetUrls,
      assessment: submission.assessment,
    }),
    scorePercent,
    passingPercent:
      totalMarks > 0 ? Math.round((assessment.passingMarks / totalMarks) * 100) : 0,
    totalMarks,
    passingMarks: assessment.passingMarks,
    assessmentType: assessment.type as AssessmentType,
    review,
  };
}
