import { NextResponse } from "next/server";
import { getCurrentUserServer } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const currentUser = await getCurrentUserServer("/courses");

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
    console.error("LEARNER_COURSES_ERROR", error);

    return NextResponse.json(
      { error: "Failed to load learner courses." },
      { status: 500 },
    );
  }
}