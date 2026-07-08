import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type {
  LearnerLiveClassesPayload,
  LearnerLiveCourse,
  LearnerLiveSession,
} from "@/lib/learner-live-types";
import { EnrollmentStatus } from "@/lib/generated/prisma/enums";

export class LearnerLiveError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LearnerLiveError";
    this.status = status;
  }
}

export async function requireLearner() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    throw new LearnerLiveError("You must be signed in.", 401);
  }

  if (user.role !== "STUDENT") {
    throw new LearnerLiveError("Learner access required.", 403);
  }

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
  };
}

export async function getLearnerLiveClasses(
  learnerId: string,
): Promise<LearnerLiveClassesPayload> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: learnerId,
      status: EnrollmentStatus.APPROVED,
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          liveClasses: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const courseIds = enrollments.map((enrollment) => enrollment.courseId);

  const courses: LearnerLiveCourse[] = enrollments.map((enrollment) => ({
    id: enrollment.course.id,
    title: enrollment.course.title,
    description: enrollment.course.description,
    liveClassCount: enrollment.course.liveClasses.length,
  }));

  if (courseIds.length === 0) {
    return { courses, sessions: [] };
  }

  const sessionRows = await prisma.liveClassSession.findMany({
    where: {
      liveClass: {
        courseId: { in: courseIds },
      },
    },
    include: {
      liveClass: {
        include: {
          course: { select: { id: true, title: true } },
          instructor: { select: { id: true, name: true } },
        },
      },
      attendances: {
        where: { userId: learnerId },
        take: 1,
      },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const sessions: LearnerLiveSession[] = sessionRows.map((row) => {
    const mine = row.attendances[0];
    return {
      id: row.id,
      liveClassId: row.liveClassId,
      scheduledStart: row.scheduledStart.toISOString(),
      scheduledEnd: row.scheduledEnd.toISOString(),
      status: row.status,
      recordingUrl: row.recordingUrl,
      liveClass: {
        id: row.liveClass.id,
        title: row.liveClass.title,
        subjectName: row.liveClass.subjectName,
        batchName: row.liveClass.batchName,
        durationMinutes: row.liveClass.durationMinutes,
        courseId: row.liveClass.course.id,
        courseTitle: row.liveClass.course.title,
        instructorId: row.liveClass.instructor.id,
        instructorName: row.liveClass.instructor.name,
      },
      myAttendance: mine
        ? {
            status: mine.status,
            durationMinutes: mine.durationMinutes,
          }
        : null,
    };
  });

  return { courses, sessions };
}
