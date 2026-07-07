"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ChevronLeft,
  CheckCircle2,
  PlayCircle,
  Lock,
  Clock,
  Video,
  BookOpen,
  HelpCircle,
  Wrench,
  LoaderCircle,
} from "lucide-react";

type ModuleType = "VIDEO" | "READING" | "QUIZ" | "PRACTICE";
type ModuleStatus = "completed" | "current" | "locked";

type CourseModule = {
  id: string;
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
};

type CourseDetail = {
  id: string;
  title: string;
  description: string;
  durationHours: number;
  coverImage: string | null;
  progress: number;
  modules: CourseModule[];
};

const MODULE_TYPE_META: Record<
  ModuleType,
  { icon: typeof Video; gradient: string }
> = {
  VIDEO: { icon: Video, gradient: "from-blue-500/25 to-blue-500/5" },
  READING: { icon: BookOpen, gradient: "from-amber-500/25 to-amber-500/5" },
  QUIZ: { icon: HelpCircle, gradient: "from-purple-500/25 to-purple-500/5" },
  PRACTICE: { icon: Wrench, gradient: "from-primary/25 to-primary/5" },
};

function getModuleTypeLabel(type: ModuleType) {
  switch (type) {
    case "VIDEO":
      return "Video";
    case "READING":
      return "Reading";
    case "QUIZ":
      return "Quiz";
    case "PRACTICE":
      return "Practice";
  }
}

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/learner/courses/${id}`, {
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load course.");
        }

        setCourse(result.course);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to load course.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading course...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold">Course unavailable</h1>
        <p className="mb-6 text-muted-foreground">
          {error || "This course could not be loaded."}
        </p>
        <Link
          href="/courses"
          className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to My Courses
        </Link>
      </div>
    );
  }

  const currentModule = course.modules.find((m) => m.status === "current");
  const continueHref = currentModule
    ? `/courses/${course.id}/module/${currentModule.id}`
    : course.modules[0]
      ? `/courses/${course.id}/module/${course.modules[0].id}`
      : null;

  return (
    <div className="px-6 py-8">
      <Link
        href="/courses"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        Back to My Courses
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{course.title}</h1>

      <p className="mb-4 text-muted-foreground">{course.description}</p>

      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{course.durationHours} total hours</span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-green-600">
          {course.progress}% complete
        </span>

        <span className="text-muted-foreground">
          {course.modules.filter((m) => m.status === "completed").length} of{" "}
          {course.modules.length} modules done
        </span>
      </div>

      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-green-500"
          style={{ width: `${course.progress}%` }}
        />
      </div>

      {continueHref && (
        <Link
          href={continueHref}
          className="mb-8 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {course.progress === 0 ? "Start Course" : "Continue Learning"}
        </Link>
      )}

      <h2 className="mb-3 text-lg font-bold">Course Content</h2>

      {course.modules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <h3 className="mb-2 text-lg font-bold">No modules added</h3>
          <p className="text-muted-foreground">
            Admin-added modules will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {course.modules.map((module) => {
            const isLocked = module.status === "locked";
            const { icon: TypeIcon, gradient } = MODULE_TYPE_META[module.type];

            const card = (
              <div
                className={`overflow-hidden rounded-lg border border-border bg-card transition-shadow ${
                  isLocked ? "opacity-60" : "hover:shadow-lg"
                }`}
              >
                <div
                  className={`relative flex h-28 items-center justify-center bg-linear-to-br ${gradient}`}
                >
                  <TypeIcon
                    className={`h-10 w-10 ${
                      module.status === "current"
                        ? "text-primary"
                        : "text-foreground/40"
                    }`}
                  />

                  <span className="absolute right-2 top-2">
                    {module.status === "completed" && (
                      <CheckCircle2
                        size={18}
                        className="text-green-500 drop-shadow"
                      />
                    )}

                    {module.status === "current" && (
                      <PlayCircle
                        size={18}
                        className="text-primary drop-shadow"
                      />
                    )}

                    {isLocked && (
                      <Lock
                        size={16}
                        className="text-muted-foreground drop-shadow"
                      />
                    )}
                  </span>
                </div>

                <div className="p-4">
                  <p
                    className={`truncate text-sm font-semibold ${
                      module.status === "current"
                        ? "text-primary"
                        : isLocked
                          ? "text-muted-foreground/60"
                          : "text-card-foreground"
                    }`}
                  >
                    {module.order}. {module.title}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getModuleTypeLabel(module.type)}</span>

                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {module.durationMinutes} min
                    </span>
                  </div>
                </div>
              </div>
            );

            return isLocked ? (
              <div key={module.id} title="Locked">
                {card}
              </div>
            ) : (
              <Link
                key={module.id}
                href={`/courses/${course.id}/module/${module.id}`}
              >
                {card}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}