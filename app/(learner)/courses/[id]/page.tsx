import Link from "next/link";
import { notFound } from "next/navigation";
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
} from "lucide-react";
import { getCourseWithModules, type UiModule } from "@/lib/mock-modules";

const MODULE_TYPE_META: Record<
  UiModule["type"],
  { icon: typeof Video; gradient: string }
> = {
  VIDEO: { icon: Video, gradient: "from-blue-500/25 to-blue-500/5" },
  READING: { icon: BookOpen, gradient: "from-amber-500/25 to-amber-500/5" },
  QUIZ: { icon: HelpCircle, gradient: "from-purple-500/25 to-purple-500/5" },
  PRACTICE: { icon: Wrench, gradient: "from-primary/25 to-primary/5" },
};

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {course.modules.map((m) => {
          const isLocked = m.status === "locked";
          const { icon: TypeIcon, gradient } = MODULE_TYPE_META[m.type];

          const card = (
            <div
              className={`bg-card border border-border rounded-lg overflow-hidden transition-shadow ${
                isLocked ? "opacity-60" : "hover:shadow-lg"
              }`}
            >
              <div
                className={`relative h-28 bg-linear-to-br ${gradient} flex items-center justify-center`}
              >
                <TypeIcon
                  className={`w-10 h-10 ${
                    m.status === "current" ? "text-primary" : "text-foreground/40"
                  }`}
                />
                <span className="absolute top-2 right-2">
                  {m.status === "completed" && (
                    <CheckCircle2 size={18} className="text-green-500 drop-shadow" />
                  )}
                  {m.status === "current" && (
                    <PlayCircle size={18} className="text-primary drop-shadow" />
                  )}
                  {isLocked && (
                    <Lock size={16} className="text-muted-foreground drop-shadow" />
                  )}
                </span>
              </div>

              <div className="p-4">
                <p
                  className={`text-sm font-semibold truncate ${
                    m.status === "current"
                      ? "text-primary"
                      : isLocked
                        ? "text-muted-foreground/60"
                        : "text-card-foreground"
                  }`}
                >
                  {m.order}. {m.title}
                </p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="capitalize">{m.type.toLowerCase()}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {m.durationMinutes} min
                  </span>
                </div>
              </div>
            </div>
          );

          return isLocked ? (
            <div key={m.id} title="Locked">
              {card}
            </div>
          ) : (
            <Link key={m.id} href={`/courses/${course.id}/module/${m.id}`}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
