import { NextResponse } from "next/server";
import { z } from "zod";
import { getActorId } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { withPermission } from "@/lib/rbac";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import {
  computeContentHash,
  createQuestionBankItem,
} from "@/lib/question-bank-server";
import type {
  BcsImportApiQuestion,
  BcsImportApiResult,
} from "@/lib/question-bank/bcs-import-types";

type Context = { params: Promise<{ id: string }> };

const importedBcsQuestionSchema = z.object({
  questionNumber: z.number().int().positive().optional(),
  subject: z.string().trim().optional().default(""),
  questionText: z.string().trim().min(1),
  marks: z.number().positive().default(1),
  options: z.object({
    A: z.string().trim().min(1),
    B: z.string().trim().min(1),
    C: z.string().trim().min(1),
    D: z.string().trim().min(1),
  }),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().trim().optional().default(""),
});

const requestSchema = z.object({
  questions: z.array(importedBcsQuestionSchema).min(1).max(100),
});

function isBcsExamType(
  name: string | null | undefined,
  slug: string | null | undefined,
) {
  return [name, slug].some((value) => value?.trim().toLowerCase() === "bcs");
}

const importBcsQuestions = async (request: Request, { params }: Context) => {
  try {
    const { id: paperId } = await params;
    const body = requestSchema.parse(await request.json());
    const actorId = await getActorId();
    const paper = await prisma.questionPaper.findUnique({
      where: { id: paperId },
      include: { examType: { select: { id: true, name: true, slug: true } } },
    });
    if (!paper) {
      return NextResponse.json(
        { error: "Question paper not found." },
        { status: 404 },
      );
    }
    if (!isBcsExamType(paper.examType?.name, paper.examType?.slug)) {
      return NextResponse.json(
        { error: "The selected paper is not a BCS paper." },
        { status: 400 },
      );
    }

    const existingHashes = new Set(
      (
        await prisma.questionBankItem.findMany({
          where: { paperId },
          select: { contentHash: true },
        })
      ).map((item) => item.contentHash),
    );
    const result: BcsImportApiResult = {
      imported: 0,
      failed: 0,
      skippedDuplicates: 0,
      items: [],
      errors: [],
    };
    let nextOrder =
      (
        await prisma.questionBankItem.aggregate({
          where: { paperId },
          _max: { order: true },
        })
      )._max.order ?? -1;

    for (const question of body.questions as BcsImportApiQuestion[]) {
      const options = [
        question.options.A,
        question.options.B,
        question.options.C,
        question.options.D,
      ];
      const contentHash = computeContentHash(question.questionText, options);
      if (existingHashes.has(contentHash)) {
        result.skippedDuplicates += 1;
        continue;
      }
      try {
        const item = await createQuestionBankItem(
          {
            type: "MCQ",
            question: question.questionText,
            subject: question.subject ?? null,
            marks: question.marks,
            options,
            correctAnswer: question.options[question.correctAnswer],
            explanation: question.explanation ?? null,
            rubric: null,
            difficulty: "MEDIUM",
            examYear: paper.examYear,
            status: "PUBLISHED",
            tags: question.subject ? [question.subject] : [],
            courseId: paper.courseId,
            moduleId: paper.moduleId,
            batchId: paper.batchId,
            examTypeId: paper.examTypeId,
            institutionId: paper.institutionId,
            paperId,
            order: ++nextOrder,
          },
          actorId,
        );
        existingHashes.add(contentHash);
        result.items.push(item);
        result.imported += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push(
          error instanceof Error ? error.message : "Could not import question.",
        );
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid import payload." },
        { status: 400 },
      );
    }
    return handleQuestionBankApiError(error);
  }
};

export const POST = withPermission(
  PermissionModule.QUESTION_BANK,
  "create",
  importBcsQuestions,
);
