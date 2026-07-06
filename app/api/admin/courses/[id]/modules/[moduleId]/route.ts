import {
  normalizeModulePayload,
  updateModule,
} from "@/lib/admin-course-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> },
) {
  const { id, moduleId } = await params;
  const module = await prisma.module.findFirst({
    where: { id: moduleId, courseId: id },
    include: {
      notes: true,
      resources: true,
      quiz: { include: { questions: true } },
    },
  });

  if (!module) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  return NextResponse.json({
    module: {
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      order: module.order,
      type: module.type,
      durationMinutes: module.durationMinutes,
      coverImage: module.coverImage,
      videoUrl: module.videoUrl,
      overview: module.overview,
      hasQuiz: module.hasQuiz,
      createdAt: module.createdAt.toISOString(),
      updatedAt: module.updatedAt.toISOString(),
      notes: module.notes.map((note) => ({
        id: note.id,
        heading: note.heading,
        body: note.body,
      })),
      resources: module.resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        type: resource.type,
        meta: resource.meta,
        fileUrl: resource.fileUrl,
      })),
      quiz: module.quiz
        ? {
            id: module.quiz.id,
            passingScore: module.quiz.passingScore,
            questions: module.quiz.questions.map((question) => ({
              id: question.id,
              question: question.question,
              options: question.options,
              correctIndex: question.correctIndex,
              marks: question.marks,
            })),
          }
        : null,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> },
) {
  try {
    const { id, moduleId } = await params;
    const existing = await prisma.module.findFirst({
      where: { id: moduleId, courseId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    const payload = normalizeModulePayload(await request.json());
    const module = await updateModule(id, moduleId, payload);
    return NextResponse.json({ module });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> },
) {
  try {
    const { id, moduleId } = await params;
    const existing = await prisma.module.findFirst({
      where: { id: moduleId, courseId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    await prisma.module.delete({ where: { id: moduleId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Module order must be unique inside the course." },
        { status: 409 },
      );
    }
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
