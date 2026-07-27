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
  /**
   * Measured length in minutes, or null when unknown. Only uploaded video
   * files report a real length — external embeds (YouTube, Facebook, Vimeo)
   * carry null and render no duration rather than an admin-typed guess.
   */
  durationMinutes: number | null;
  coverImage: string | null;
  videoUrl: string | null;
  youtubeVideoId: string | null;
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
  /** Last saved playback position, in seconds, as stored on the server. */
  positionSeconds: number;
  durationSeconds: number;
  /** Seconds still to wait before this module completes; 0 when already served. */
  remainingUnlockSeconds: number;
  /** Total wait a module requires, so the client can render a countdown. */
  unlockDelaySeconds: number;
  /**
   * True when this module has a video our players can actually measure —
   * both the uploaded-file player and the YouTube IFrame player report real
   * position and length. Such a module completes by WATCH PERCENT. A module
   * with nothing to play has no percentage to measure and falls back to the
   * elapsed-time timer instead.
   */
  hasMeasurableVideo: boolean;
}

