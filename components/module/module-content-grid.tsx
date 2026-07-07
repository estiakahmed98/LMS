import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, PlayCircle, Lock, Play } from "lucide-react";
import { useTranslations } from "next-intl";

type ModuleStatus = "completed" | "current" | "locked";

type CourseModule = {
  id: string;
  title: string;
  order: number;
  durationMinutes: number;
  coverImage?: string | null;
  videoUrl?: string | null;
  status: ModuleStatus;
};

type CourseForContentGrid = {
  id: string;
  title: string;
  coverImage?: string | null;
  modules: CourseModule[];
};

export default function ModuleContentGrid({
  course,
  activeModuleId,
  maxHeight,
}: {
  course: CourseForContentGrid;
  activeModuleId: string;
  maxHeight?: number;
}) {
  const t = useTranslations();
  const modules = course.modules ?? [];

  return (
    <aside className="rounded-xl border border-border p-4 md:sticky md:top-20 md:self-start">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">
        {t("learner.courseDetail.courseContent").toUpperCase()}
      </p>

      <div
        className="md:overflow-y-auto md:pr-1"
        style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
      >
        {modules.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
            No modules added yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {modules.map((module) => {
              const isActive = module.id === activeModuleId;
              const isLocked = module.status === "locked";
              const thumbnail = module.coverImage || course.coverImage;

              const card = (
                <div
                  className={`overflow-hidden rounded-lg border transition-colors ${
                    isActive
                      ? "border-primary"
                      : isLocked
                        ? "border-border opacity-50"
                        : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-gray-900">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt={module.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 320px"
                        className="object-cover"
                      />
                    ) : null}

                    <div className="absolute inset-0 bg-black/35" />

                    <div className="relative z-10">
                      {isLocked ? (
                        <Lock size={18} className="text-white/80" />
                      ) : (
                        <Play
                          size={18}
                          className="text-white/90"
                          fill="currentColor"
                        />
                      )}
                    </div>

                    <span className="absolute right-1 top-1 z-10">
                      {module.status === "completed" && (
                        <CheckCircle2
                          size={14}
                          className="text-green-500 drop-shadow"
                        />
                      )}

                      {module.status === "current" && (
                        <PlayCircle
                          size={14}
                          className="text-primary drop-shadow"
                        />
                      )}
                    </span>

                    <span className="absolute bottom-1 right-1 z-10 rounded bg-black/60 px-1 text-[10px] font-medium text-white/90">
                      {module.durationMinutes}m
                    </span>
                  </div>

                  <p
                    className={`line-clamp-2 px-1.5 py-1.5 text-xs leading-snug ${
                      isActive
                        ? "font-semibold text-primary"
                        : isLocked
                          ? "text-muted-foreground/50"
                          : "text-card-foreground"
                    }`}
                  >
                    {module.order}. {module.title}
                  </p>
                </div>
              );

              return isLocked ? (
                <div key={module.id} title={t("learner.courseDetail.locked")}>
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
    </aside>
  );
}