// app/(learner)/courses/[courseId]/module/[moduleId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  CheckCircle2,
  PlayCircle,
  Lock,
  Play,
} from "lucide-react";
import { getCourseWithModules, getModule } from "@/lib/mock-modules";

export default async function ModuleDetailPage({
  params,
}: {
  params: { courseId: string; moduleId: string };
}) {
  const data = await getModule(params.courseId, params.moduleId);
  if (!data) notFound();

  const { course, module } = data;
  const doneCount = course.modules.filter(
    (m) => m.status === "completed",
  ).length;

  return (
    <div className="px-6 py-8">
      {/* Back link */}
      <Link
        href={`/courses/${course.id}/module`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-red-600"
      >
        <ChevronLeft size={16} />
        Back to {course.title}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT: video + content */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-red-600">
              {course.title.toUpperCase()} — MODULE {module.order}
            </p>
            <span className="text-xs font-medium text-gray-400">
              {doneCount} / {course.modules.length} done
            </span>
          </div>

          {/* Video player mock */}
          <div className="relative flex aspect-video items-center justify-center rounded-xl bg-gray-900">
            <button
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-red-600 transition hover:bg-white"
              aria-label="Play video"
            >
              <Play size={28} className="ml-1" fill="currentColor" />
            </button>
            <div className="absolute bottom-3 left-4 text-xs font-medium text-white/80">
              00:00 / {module.durationMinutes}:00
            </div>
          </div>

          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {module.title}
          </h1>

          {/* Tabs */}
          <div className="mt-4 flex gap-6 border-b border-gray-200 text-sm font-medium text-gray-500">
            <button className="border-b-2 border-red-600 pb-2 text-red-600">
              Overview
            </button>
            <button className="pb-2 hover:text-gray-700">Notes</button>
            <button className="pb-2 hover:text-gray-700">Resources</button>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {module.description}
          </p>

          <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Videos unlock in order — each lesson opens only after the previous
              one is finished.
            </p>
            <button className="whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
              Mark Complete
            </button>
          </div>

          {module.hasQuiz && (
            <Link
              href={`/courses/${course.id}/module/${module.id}/practice`}
              className="mt-3 block rounded-xl border border-gray-200 p-4 text-sm font-medium text-gray-700 hover:border-red-200 hover:text-red-600"
            >
              Take the practice quiz for this module →
            </Link>
          )}
        </div>

        {/* RIGHT: course content sidebar */}
        <aside className="h-fit rounded-xl border border-gray-200 p-4">
          <p className="mb-3 text-xs font-semibold text-gray-400">
            COURSE CONTENT
          </p>
          <div className="space-y-1">
            {course.modules.map((m) => {
              const isActive = m.id === module.id;
              const isLocked = m.status === "locked";
              const row = (
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    isActive
                      ? "bg-red-50 font-semibold text-red-600"
                      : isLocked
                        ? "text-gray-300"
                        : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {m.status === "completed" && (
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-green-500"
                    />
                  )}
                  {m.status === "current" && (
                    <PlayCircle size={16} className="shrink-0 text-red-600" />
                  )}
                  {m.status === "locked" && (
                    <Lock size={14} className="shrink-0 text-gray-300" />
                  )}
                  <span className="truncate">
                    {m.order}. {m.title}
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
        </aside>
      </div>
    </div>
  );
}
