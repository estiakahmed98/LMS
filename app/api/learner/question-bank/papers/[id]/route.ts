import { NextResponse } from "next/server";
import {
  LearnerAuthError,
  requireLearner,
} from "@/lib/learner-auth-server";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireLearner("/question-bank", {
      module: PermissionModule.QUESTION_BANK,
      action: "view",
    });

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, status: "APPROVED" },
      select: { courseId: true },
    });
    const courseIds = new Set(enrollments.map((item) => item.courseId));

    const paper = await prisma.questionPaper.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        specialInstructions: true,
        examYear: true,
        courseId: true,
        course: { select: { title: true } },
        module: { select: { title: true } },
        examType: { select: { name: true } },
        questions: {
          where: { status: "PUBLISHED" },
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            difficulty: true,
            marks: true,
            order: true,
          },
        },
      },
    });

    if (!paper) {
      return NextResponse.json({ error: "Question paper not found." }, { status: 404 });
    }

    if (paper.courseId && !courseIds.has(paper.courseId)) {
      return NextResponse.json({ error: "Question paper not found." }, { status: 404 });
    }

    if (paper.questions.length === 0) {
      return NextResponse.json({ error: "Question paper not found." }, { status: 404 });
    }

    return NextResponse.json({
      paper: {
        id: paper.id,
        title: paper.title,
        specialInstructions: paper.specialInstructions,
        examYear: paper.examYear,
        courseTitle: paper.course?.title ?? null,
        moduleTitle: paper.module?.title ?? null,
        examTypeName: paper.examType?.name ?? null,
        questionCount: paper.questions.length,
        totalMarks: paper.questions.reduce(
          (sum, question) => sum + (question.marks ?? 0),
          0,
        ),
        questions: paper.questions.map((question) => ({
          id: question.id,
          type: question.type,
          question: question.question,
          options: question.options,
          difficulty: question.difficulty,
          marks: question.marks,
          order: question.order,
        })),
      },
    });
  } catch (error) {
    if (error instanceof LearnerAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("LEARNER_QUESTION_BANK_DETAIL_ERROR", error);
    return NextResponse.json(
      { error: "Failed to load question paper." },
      { status: 500 },
    );
  }
}
