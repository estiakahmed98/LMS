import Link from "next/link";
import { CheckCircle2, PlayCircle, Lock, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UiCourse } from "@/lib/mock-modules";

export default function ModuleContentGrid({
  course,
  activeModuleId,
  maxHeight,
}: {
  course: UiCourse;
  activeModuleId: string;
  maxHeight?: number;
}) {
  const t = useTranslations();

  return (
    <aside className="rounded-xl border border-border p-4 md:sticky md:top-20 md:self-start">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        {t("learner.courseDetail.courseContent").toUpperCase()}
      </p>
      <div
        className="md:overflow-y-auto md:pr-1"
        style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
      >
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
          {course.modules.map((m) => {
            const isActive = m.id === activeModuleId;
            const isLocked = m.status === "locked";

            const card = (
              <div
                className={`rounded-lg overflow-hidden border transition-colors ${
                  isActive
                    ? "border-primary"
                    : isLocked
                      ? "border-border opacity-50"
                      : "border-border hover:border-primary/40"
                }`}
              >
                <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
                  {isLocked ? (
                    <Lock size={18} className="text-white/70" />
                  ) : (
                    <Play
                      size={18}
                      className="text-white/90"
                      fill="currentColor"
                    />
                  )}
                  <span className="absolute top-1 right-1">
                    {m.status === "completed" && (
                      <CheckCircle2
                        size={14}
                        className="text-green-500 drop-shadow"
                      />
                    )}
                    {m.status === "current" && (
                      <PlayCircle
                        size={14}
                        className="text-primary drop-shadow"
                      />
                    )}
                  </span>
                  <span className="absolute bottom-1 right-1 text-[10px] font-medium text-white/90 bg-black/50 rounded px-1">
                    {m.durationMinutes}m
                  </span>
                </div>
                <p
                  className={`px-1.5 py-1.5 text-xs leading-snug line-clamp-2 ${
                    isActive
                      ? "font-semibold text-primary"
                      : isLocked
                        ? "text-muted-foreground/50"
                        : "text-card-foreground"
                  }`}
                >
                  {m.order}. {m.title}
                </p>
              </div>
            );

            return isLocked ? (
              <div key={m.id} title={t("learner.courseDetail.locked")}>
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
    </aside>
  );
}
