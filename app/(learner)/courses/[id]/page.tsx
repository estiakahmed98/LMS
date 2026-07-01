import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  PlayCircle,
  Lock,
  Clock,
} from "lucide-react";
import { getCourseWithModules } from "@/lib/mock-modules";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourseWithModules(id);
  if (!course) notFound();

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

      <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
      <p className="text-muted-foreground mb-4">{course.description}</p>

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Clock className="w-4 h-4" />
        <span>{course.duration}h total</span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold text-green-600">
          {course.progress}% complete
        </span>
        <span className="text-muted-foreground">
          {course.modules.filter((m) => m.status === "completed").length} /{" "}
          {course.modules.length} modules done
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-6">
        <div
          className="bg-green-500 h-full rounded-full"
          style={{ width: `${course.progress}%` }}
        ></div>
      </div>

      {continueHref && (
        <Link
          href={continueHref}
          className="mb-8 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {course.progress === 0 ? "Start Course" : "Continue Learning"}
        </Link>
      )}

      <h2 className="text-lg font-bold mb-3">Course Content</h2>
      <div className="space-y-2">
        {course.modules.map((m) => {
          const isLocked = m.status === "locked";
          const row = (
            <div
              className={`flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm ${
                m.status === "current"
                  ? "bg-primary/5 font-semibold text-primary"
                  : isLocked
                    ? "text-muted-foreground/50"
                    : "text-card-foreground hover:bg-muted/50"
              }`}
            >
              {m.status === "completed" && (
                <CheckCircle2 size={16} className="shrink-0 text-green-500" />
              )}
              {m.status === "current" && (
                <PlayCircle size={16} className="shrink-0 text-primary" />
              )}
              {m.status === "locked" && (
                <Lock size={14} className="shrink-0 text-muted-foreground/50" />
              )}
              <span className="flex-1 truncate">
                {m.order}. {m.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.durationMinutes} min
              </span>
            </div>
          );

          return isLocked ? (
            <div key={m.id} title="Locked">
              {row}
            </div>
          ) : (
            <Link key={m.id} href={`/courses/${course.id}/module/${m.id}`}>
              {row}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
