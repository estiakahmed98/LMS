import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LearnerAuthError, requireLearner } from "@/lib/learner-auth-server";
import { unstable_cache } from "next/cache";

const getCachedLearnerEnrollments = unstable_cache(
  async (userId: string) => prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: { include: { modules: { orderBy: { order: "asc" } } } },
    },
    orderBy: { enrolledAt: "desc" },
  }),
  ["learner-courses-v1"],
  { revalidate: 30, tags: ["learner-data", "learner-courses"] },
);

export async function GET() {
  try {
    const currentUser = await requireLearner("/courses");

    const enrollments = await getCachedLearnerEnrollments(currentUser.id);

    return NextResponse.json({
      enrollments: enrollments.map((enrollment) => ({
        ...enrollment,
        course:
          enrollment.status === "APPROVED"
            ? enrollment.course
            : { ...enrollment.course, modules: [] },
      })),
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("LEARNER_COURSES_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load learner courses." },
      { status: 500 },
    );
  }
}
