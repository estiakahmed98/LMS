export type CourseStatusValue = "PUBLISHED" | "DRAFT" | "ARCHIVED";
export type CourseLevelValue = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type ModuleTypeValue = "VIDEO" | "READING" | "QUIZ" | "PRACTICE";
export type ResourceTypeValue = "PDF" | "LINK" | "SLIDES" | "FILE";

export interface AdminCourseSummary {
  id: string;
  title: string;
  description: string;
  durationHours: number;
  level: CourseLevelValue;
  categoryId: string | null;
  categoryName: string | null;
  status: CourseStatusValue;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
  enrolledCount: number;
  moduleCount: number;
}

export interface AdminModuleNoteItem {
  id: string;
  heading: string;
  body: string;
}

export interface AdminModuleResourceItem {
  id: string;
  title: string;
  type: ResourceTypeValue;
  meta: string;
  fileUrl: string | null;
}

export interface AdminModuleQuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  marks: number;
}

export interface AdminModuleDetail {
  id: string;
  courseId: string;
  title: string;
  order: number;
  type: ModuleTypeValue;
  durationMinutes: number;
  coverImage: string | null;
  videoUrl: string | null;
  overview: string | null;
  hasQuiz: boolean;
  createdAt: string;
  updatedAt: string;
  notes: AdminModuleNoteItem[];
  resources: AdminModuleResourceItem[];
  quiz: {
    id: string | null;
    passingScore: number;
    questions: AdminModuleQuizQuestionItem[];
  } | null;
}

export interface AdminCourseDetail extends AdminCourseSummary {
  modules: AdminModuleDetail[];
}

export interface AdminCoursePayload {
  title: string;
  description: string;
  durationHours: number;
  level: CourseLevelValue;
  categoryName: string;
  status: CourseStatusValue;
  coverImage: string | null;
}

export interface AdminModulePayload {
  title: string;
  order: number;
  type: ModuleTypeValue;
  durationMinutes: number;
  coverImage: string | null;
  videoUrl: string | null;
  overview: string | null;
  hasQuiz: boolean;
  notes: Array<{
    id?: string;
    heading: string;
    body: string;
  }>;
  resources: Array<{
    id?: string;
    title: string;
    type: ResourceTypeValue;
    meta: string;
    fileUrl: string | null;
  }>;
  quiz: {
    passingScore: number;
    questions: Array<{
      id?: string;
      question: string;
      options: string[];
      correctIndex: number;
      marks: number;
    }>;
  } | null;
}
