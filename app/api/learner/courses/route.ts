import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LearnerAuthError, requireLearner } from "@/lib/learner-auth-server";

export async function GET() {
  try {
    const currentUser = await requireLearner("/courses");

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        course: {
          include: {
            modules: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    return NextResponse.json({ enrollments });
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