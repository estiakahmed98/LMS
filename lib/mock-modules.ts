// Mock data helpers for the learner course/module pages
import {
  mockCourses,
  mockModules,
  mockEnrollments,
  getEnrollmentsByUserId,
} from "./mock-data";

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
  type: "VIDEO" | "READING" | "QUIZ" | "PRACTICE";
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
      hasQuiz: true,
      type: m.type,
    };
  });
}

export async function getCourseWithModules(
  courseId: string,
  userId = "user_1",
): Promise<UiCourse | null> {
  const course = mockCourses.find((c) => c.id === courseId);
  if (!course) return null;

  const enrollment = getEnrollmentsByUserId(userId).find(
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
  userId = "user_1",
): Promise<{ course: UiCourse; module: UiModule } | null> {
  const course = await getCourseWithModules(courseId, userId);
  if (!course) return null;

  const module = course.modules.find((m) => m.id === moduleId);
  if (!module) return null;

  return { course, module };
}

// Marks a module as watched by nudging the learner's enrollment progress
// forward just enough to unlock the next module in order. No-ops if the
// module is already completed or isn't the learner's current module.
export function markModuleWatched(
  courseId: string,
  moduleId: string,
  userId: string,
): void {
  const enrollment = mockEnrollments.find(
    (e) => e.userId === userId && e.courseId === courseId,
  );
  if (!enrollment) return;

  const modules = mockModules
    .filter((m) => m.courseId === courseId)
    .sort((a, b) => a.order - b.order);
  const index = modules.findIndex((m) => m.id === moduleId);
  if (index === -1) return;

  const completedCount = Math.floor(
    (enrollment.progress / 100) * modules.length,
  );
  if (index !== completedCount) return;

  const newCompletedCount = Math.min(modules.length, completedCount + 1);
  enrollment.progress = Math.round((newCompletedCount / modules.length) * 100);
  if (enrollment.progress >= 100) {
    enrollment.completedAt = new Date();
  }
}

export interface ModuleNote {
  id: string;
  heading: string;
  body: string;
}

export interface ModuleResource {
  id: string;
  title: string;
  type: "PDF" | "LINK" | "SLIDES";
  meta: string;
}

// No real notes/resource bank exists yet, so each module gets small
// generic study content themed around its own title.
export function getModuleNotes(module: UiModule): ModuleNote[] {
  return [
    {
      id: `${module.id}-note-1`,
      heading: "Key takeaways",
      body: `Summarize the core ideas from "${module.title}" in your own words before moving on — this helps lock in the concepts covered in this lesson.`,
    },
    {
      id: `${module.id}-note-2`,
      heading: "Common mistakes",
      body: `Learners often rush through "${module.title}" without reviewing examples. Re-watch any section that felt unclear before attempting the quiz.`,
    },
  ];
}

export function getModuleResources(module: UiModule): ModuleResource[] {
  return [
    {
      id: `${module.id}-res-1`,
      title: `${module.title} — Slide Deck`,
      type: "SLIDES",
      meta: "12 slides",
    },
    {
      id: `${module.id}-res-2`,
      title: `${module.title} — Reading Handout`,
      type: "PDF",
      meta: "2 pages",
    },
    {
      id: `${module.id}-res-3`,
      title: "Further reading",
      type: "LINK",
      meta: "External article",
    },
  ];
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
  userId = "user_1",
): Promise<{ course: UiCourse; module: UiModule; quiz: Quiz } | null> {
  const data = await getModule(courseId, moduleId, userId);
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
