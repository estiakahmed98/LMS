// Mock data helpers for the learner course/module pages
import {
  mockCourses,
  mockModules,
  getEnrollmentsByUserId,
} from "./mock-data";
import { getCurrentUser } from "./auth";

export type ModuleStatus = "completed" | "current" | "locked";

export interface UiModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  durationMinutes: number;
  status: ModuleStatus;
  hasQuiz: boolean;
}

export interface UiCourse {
  id: string;
  title: string;
  description: string;
  duration: number;
  progress: number;
  modules: UiModule[];
}

// Derives per-module completion status from the learner's overall
// enrollment progress percentage, so course list, course dashboard,
// and module pages all agree on how far the learner has gotten.
function buildCourseModules(courseId: string, progress: number): UiModule[] {
  const modules = mockModules
    .filter((m) => m.courseId === courseId)
    .sort((a, b) => a.order - b.order);

  const completedCount = Math.floor((progress / 100) * modules.length);

  return modules.map((m, index) => {
    let status: ModuleStatus;
    if (index < completedCount) status = "completed";
    else if (index === completedCount) status = "current";
    else status = "locked";

    return {
      id: m.id,
      courseId: m.courseId,
      title: m.title,
      description: `Learn the key concepts covered in "${m.title}".`,
      order: m.order,
      durationMinutes: m.duration,
      status,
      hasQuiz: m.type === "QUIZ" || m.type === "PRACTICE",
    };
  });
}

export async function getCourseWithModules(
  courseId: string,
): Promise<UiCourse | null> {
  const course = mockCourses.find((c) => c.id === courseId);
  if (!course) return null;

  const currentUser = getCurrentUser();
  const enrollment = getEnrollmentsByUserId(currentUser?.id ?? "").find(
    (e) => e.courseId === courseId,
  );
  const progress = enrollment?.progress ?? 0;

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    duration: course.duration,
    progress,
    modules: buildCourseModules(course.id, progress),
  };
}

export async function getModule(
  courseId: string,
  moduleId: string,
): Promise<{ course: UiCourse; module: UiModule } | null> {
  const course = await getCourseWithModules(courseId);
  if (!course) return null;

  const module = course.modules.find((m) => m.id === moduleId);
  if (!module) return null;

  return { course, module };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Quiz {
  moduleId: string;
  moduleTitle: string;
  passingScore: number;
  questions: QuizQuestion[];
}

// No real question bank exists yet, so each quiz-enabled module gets a
// small set of generic mock questions themed around its title.
function buildQuizQuestions(module: UiModule): QuizQuestion[] {
  return [
    {
      id: `${module.id}-q1`,
      question: `What is the main focus of "${module.title}"?`,
      options: [
        `Core concepts covered in ${module.title}`,
        "Unrelated topic A",
        "Unrelated topic B",
        "Unrelated topic C",
      ],
      correctIndex: 0,
    },
    {
      id: `${module.id}-q2`,
      question: `Which statement best applies after completing "${module.title}"?`,
      options: [
        "None of the learning objectives were met",
        "You should be able to apply what was taught in this module",
        "This module has no practical use",
        "This module is optional",
      ],
      correctIndex: 1,
    },
    {
      id: `${module.id}-q3`,
      question: `In "${module.title}", what should you do if you're unsure of an answer?`,
      options: [
        "Skip the course entirely",
        "Guess randomly without reviewing",
        "Re-watch the module content and review your notes",
        "Ignore it",
      ],
      correctIndex: 2,
    },
  ];
}

export async function getQuizForModule(
  courseId: string,
  moduleId: string,
): Promise<{ course: UiCourse; module: UiModule; quiz: Quiz } | null> {
  const data = await getModule(courseId, moduleId);
  if (!data) return null;
  if (!data.module.hasQuiz) return null;

  const quiz: Quiz = {
    moduleId: data.module.id,
    moduleTitle: data.module.title,
    passingScore: 70,
    questions: buildQuizQuestions(data.module),
  };

  return { ...data, quiz };
}
