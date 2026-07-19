export type ModuleStatus = "completed" | "current" | "locked";

export type ModuleType = "VIDEO" | "READING" | "QUIZ" | "PRACTICE";

export type ModuleResourceType = "PDF" | "LINK" | "SLIDES" | "FILE";

export interface LearnerModuleNote {
  id: string;
  heading: string;
  body: string;
}

export interface LearnerModuleResource {
  id: string;
  title: string;
  type: ModuleResourceType;
  meta: string;
  fileUrl?: string | null;
}

export interface LearnerQuizQuestion {
  id: string;
  question: string;
  options: string[];
  marks: number;
}

export interface LearnerQuiz {
  id: string;
  courseId: string;
  moduleId: string;
  passingScore: number;
  questions: LearnerQuizQuestion[];
}

export interface LearnerCourseModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
  type: ModuleType;
  durationMinutes: number;
  coverImage: string | null;
  videoUrl: string | null;
  overview: string | null;
  hasQuiz: boolean;
  watchedPercent: number;
  status: ModuleStatus;
}

export interface LearnerCourse {
  id: string;
  title: string;
  description: string;
  durationHours: number;
  coverImage: string | null;
  progress: number;
  modules: LearnerCourseModule[];
}

export interface LearnerModule extends LearnerCourseModule {
  positionSeconds: number;
  durationSeconds: number;
}

