import { NextResponse } from "next/server";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireLearner("/question-bank", {
      module: PermissionModule.QUESTION_BANK,
      action: "view",
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "APPROVED" },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((item) => item.courseId);

    const papers = await prisma.questionPaper.findMany({
      where: {
        OR: [
          { courseId: { in: courseIds } },
          { courseId: null },
        ],
        questions: { some: { status: "PUBLISHED" } },
      },
      select: {
        id: true,
        title: true,
        examYear: true,
        course: { select: { title: true } },
        module: { select: { title: true } },
        examType: { select: { name: true } },
        questions: {
          where: { status: "PUBLISHED" },
          select: { id: true, type: true, marks: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      papers: papers.map((paper) => ({
        id: paper.id,
        title: paper.title,
        courseTitle: paper.course?.title ?? null,
        moduleTitle: paper.module?.title ?? null,
        examTypeName: paper.examType?.name ?? null,
        examYear: paper.examYear,
        questionCount: paper.questions.length,
        totalMarks: paper.questions.reduce(
          (sum, question) => sum + (question.marks ?? 0),
          0,
        ),
        questionTypes: [...new Set(paper.questions.map((item) => item.type))],
      })),
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("LEARNER_QUESTION_BANK_LIST_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load question papers." },
      { status: 500 },
    );
  }
}
