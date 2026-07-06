import { prisma } from "@/lib/prisma";
import type {
  AdminCourseDetail,
  AdminCoursePayload,
  AdminCourseSummary,
  AdminModuleDetail,
  AdminModulePayload,
} from "@/lib/admin-course-types";
import {
  CourseLevel,
  CourseStatus,
  ModuleType,
  ResourceType,
} from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";

const courseInclude = {
  category: true,
  enrollments: { select: { id: true } },
  modules: {
    include: {
      notes: true,
      resources: true,
      quiz: {
        include: {
          questions: {
            orderBy: { id: "asc" },
          },
        },
      },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.CourseInclude;

const moduleInclude = {
  notes: true,
  resources: true,
  quiz: {
    include: {
      questions: {
        orderBy: { id: "asc" },
      },
    },
  },
} satisfies Prisma.ModuleInclude;

function serializeModule(
  module: Prisma.ModuleGetPayload<{ include: typeof moduleInclude }>,
): AdminModuleDetail {
  return {
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
  };
}

function serializeCourseSummary(
  course: Prisma.CourseGetPayload<{
    include: {
      category: true;
      enrollments: { select: { id: true } };
      modules: { select: { id: true } };
    };
  }>,
): AdminCourseSummary {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    durationHours: course.durationHours,
    level: course.level,
    categoryId: course.categoryId,
    categoryName: course.category?.name ?? null,
    status: course.status,
    coverImage: course.coverImage,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    enrolledCount: course.enrollments.length,
    moduleCount: course.modules.length,
  };
}

function serializeCourseDetail(
  course: Prisma.CourseGetPayload<{ include: typeof courseInclude }>,
): AdminCourseDetail {
  return {
    ...serializeCourseSummary(course),
    modules: course.modules.map(serializeModule),
  };
}

async function ensureCategory(categoryName: string) {
  const name = categoryName.trim();
  if (!name) {
    return null;
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
}

export function normalizeCoursePayload(input: unknown): AdminCoursePayload {
  const payload = (input ?? {}) as Partial<AdminCoursePayload>;
  const durationHours = Number(payload.durationHours);
  const normalizedLevel = String(payload.level ?? "").toUpperCase();
  const normalizedStatus = String(payload.status ?? "").toUpperCase();

  if (!payload.title?.trim()) {
    throw new Error("Course title is required.");
  }
  if (!payload.description?.trim()) {
    throw new Error("Course description is required.");
  }
  if (!Number.isFinite(durationHours) || durationHours < 1) {
    throw new Error("Duration hours must be at least 1.");
  }
  if (!Object.values(CourseLevel).includes(normalizedLevel as CourseLevel)) {
    throw new Error("Invalid course level.");
  }
  if (!Object.values(CourseStatus).includes(normalizedStatus as CourseStatus)) {
    throw new Error("Invalid course status.");
  }

  return {
    title: payload.title.trim(),
    description: payload.description.trim(),
    durationHours: Math.round(durationHours),
    level: normalizedLevel as CourseLevel,
    categoryName: payload.categoryName?.trim() ?? "",
    status: normalizedStatus as CourseStatus,
    coverImage: payload.coverImage?.trim() || null,
  };
}

export function normalizeModulePayload(input: unknown): AdminModulePayload {
  const payload = (input ?? {}) as Partial<AdminModulePayload>;
  const order = Number(payload.order);
  const durationMinutes = Number(payload.durationMinutes);
  const normalizedType = String(payload.type ?? "").toUpperCase();

  if (!payload.title?.trim()) {
    throw new Error("Module title is required.");
  }
  if (!Number.isFinite(order) || order < 1) {
    throw new Error("Module order must be at least 1.");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error("Module duration must be 0 or greater.");
  }
  if (!Object.values(ModuleType).includes(normalizedType as ModuleType)) {
    throw new Error("Invalid module type.");
  }

  const notes = Array.isArray(payload.notes)
    ? payload.notes
        .map((note) => ({
          id: note.id,
          heading: note.heading?.trim() ?? "",
          body: note.body?.trim() ?? "",
        }))
        .filter((note) => note.heading || note.body)
    : [];

  const resources = Array.isArray(payload.resources)
    ? payload.resources
        .map((resource) => {
          const type = String(resource.type ?? "").toUpperCase();
          if (!Object.values(ResourceType).includes(type as ResourceType)) {
            throw new Error("Invalid resource type.");
          }
          return {
            id: resource.id,
            title: resource.title?.trim() ?? "",
            type: type as ResourceType,
            meta: resource.meta?.trim() ?? "",
            fileUrl: resource.fileUrl?.trim() || null,
          };
        })
        .filter((resource) => resource.title)
    : [];

  const hasQuiz = Boolean(payload.hasQuiz);
  const quiz = payload.quiz
    ? {
        passingScore: Math.min(
          100,
          Math.max(0, Number(payload.quiz.passingScore ?? 70)),
        ),
        questions: Array.isArray(payload.quiz.questions)
          ? payload.quiz.questions
              .map((question) => ({
                id: question.id,
                question: question.question?.trim() ?? "",
                options: Array.isArray(question.options)
                  ? question.options.map((option) => option.trim())
                  : [],
                correctIndex: Math.max(0, Number(question.correctIndex ?? 0)),
                marks: Math.max(1, Number(question.marks ?? 5)),
              }))
              .filter(
                (question) =>
                  question.question && question.options.filter(Boolean).length >= 2,
              )
          : [],
      }
    : null;

  return {
    title: payload.title.trim(),
    order: Math.round(order),
    type: normalizedType as ModuleType,
    durationMinutes: Math.round(durationMinutes),
    coverImage: payload.coverImage?.trim() || null,
    videoUrl: payload.videoUrl?.trim() || null,
    overview: payload.overview?.trim() || null,
    hasQuiz,
    notes,
    resources,
    quiz:
      hasQuiz || (quiz?.questions.length ?? 0) > 0
        ? {
            passingScore: quiz?.passingScore ?? 70,
            questions:
              quiz?.questions.map((question) => ({
                ...question,
                options: question.options.filter(Boolean),
                correctIndex: Math.min(
                  question.options.filter(Boolean).length - 1,
                  question.correctIndex,
                ),
              })) ?? [],
          }
        : null,
  };
}

export async function listCourses() {
  const courses = await prisma.course.findMany({
    include: {
      category: true,
      enrollments: { select: { id: true } },
      modules: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return courses.map(serializeCourseSummary);
}

export async function getCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: courseInclude,
  });

  return course ? serializeCourseDetail(course) : null;
}

export async function createCourse(payload: AdminCoursePayload) {
  const category = await ensureCategory(payload.categoryName);

  const course = await prisma.course.create({
    data: {
      title: payload.title,
      description: payload.description,
      durationHours: payload.durationHours,
      level: payload.level,
      status: payload.status,
      coverImage: payload.coverImage,
      categoryId: category?.id ?? null,
    },
    include: courseInclude,
  });

  return serializeCourseDetail(course);
}

export async function updateCourse(courseId: string, payload: AdminCoursePayload) {
  const category = await ensureCategory(payload.categoryName);

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      title: payload.title,
      description: payload.description,
      durationHours: payload.durationHours,
      level: payload.level,
      status: payload.status,
      coverImage: payload.coverImage,
      categoryId: category?.id ?? null,
    },
    include: courseInclude,
  });

  return serializeCourseDetail(course);
}

export async function createModule(courseId: string, payload: AdminModulePayload) {
  const module = await prisma.module.create({
    data: {
      courseId,
      title: payload.title,
      order: payload.order,
      type: payload.type,
      durationMinutes: payload.durationMinutes,
      coverImage: payload.coverImage,
      videoUrl: payload.videoUrl,
      overview: payload.overview,
      hasQuiz: payload.hasQuiz,
      notes: payload.notes.length
        ? {
            create: payload.notes.map((note) => ({
              heading: note.heading,
              body: note.body,
            })),
          }
        : undefined,
      resources: payload.resources.length
        ? {
            create: payload.resources.map((resource) => ({
              title: resource.title,
              type: resource.type,
              meta: resource.meta,
              fileUrl: resource.fileUrl,
            })),
          }
        : undefined,
      quiz: payload.quiz
        ? {
            create: {
              passingScore: payload.quiz.passingScore,
              questions: payload.quiz.questions.length
                ? {
                    create: payload.quiz.questions.map((question) => ({
                      question: question.question,
                      options: question.options,
                      correctIndex: question.correctIndex,
                      marks: question.marks,
                    })),
                  }
                : undefined,
            },
          }
        : undefined,
    },
    include: moduleInclude,
  });

  return serializeModule(module);
}

export async function updateModule(
  courseId: string,
  moduleId: string,
  payload: AdminModulePayload,
) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.module.findFirst({
      where: { id: moduleId, courseId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Module not found.");
    }

    await tx.module.update({
      where: { id: moduleId },
      data: {
        title: payload.title,
        order: payload.order,
        type: payload.type,
        durationMinutes: payload.durationMinutes,
        coverImage: payload.coverImage,
        videoUrl: payload.videoUrl,
        overview: payload.overview,
        hasQuiz: payload.hasQuiz,
      },
    });

    await tx.moduleNote.deleteMany({ where: { moduleId } });
    if (payload.notes.length) {
      await tx.moduleNote.createMany({
        data: payload.notes.map((note) => ({
          moduleId,
          heading: note.heading,
          body: note.body,
        })),
      });
    }

    await tx.moduleResource.deleteMany({ where: { moduleId } });
    if (payload.resources.length) {
      await tx.moduleResource.createMany({
        data: payload.resources.map((resource) => ({
          moduleId,
          title: resource.title,
          type: resource.type,
          meta: resource.meta,
          fileUrl: resource.fileUrl,
        })),
      });
    }

    await tx.moduleQuizQuestion.deleteMany({
      where: { quiz: { moduleId } },
    });

    if (payload.quiz) {
      const quiz = await tx.moduleQuiz.upsert({
        where: { moduleId },
        update: { passingScore: payload.quiz.passingScore },
        create: { moduleId, passingScore: payload.quiz.passingScore },
      });

      if (payload.quiz.questions.length) {
        await tx.moduleQuizQuestion.createMany({
          data: payload.quiz.questions.map((question) => ({
            quizId: quiz.id,
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            marks: question.marks,
          })),
        });
      }
    } else {
      await tx.moduleQuiz.deleteMany({ where: { moduleId } });
    }
  });

  const module = await prisma.module.findFirst({
    where: { id: moduleId, courseId },
    include: moduleInclude,
  });

  if (!module) {
    throw new Error("Module not found.");
  }

  return serializeModule(module);
}
