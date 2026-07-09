"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  LearnerCourse,
  LearnerModule,
  LearnerQuiz,
  LearnerModuleNote,
  LearnerModuleResource,
  ModuleStatus,
} from "@/lib/learner-module-types";
import VideoPlayer from "@/components/module/video-player";
import ModuleContentGrid from "@/components/module/module-content-grid";
import OverviewTab from "@/components/module/overview-tab";
import NotesTab from "@/components/module/notes-tab";
import ResourcesTab from "@/components/module/resources-tab";
import QuizTab from "@/components/module/quiz-tab";

type Tab = "overview" | "notes" | "resources" | "quiz";

export default function ModuleDetailClient({
  course,
  module,
  quiz,
  notes = [],
  resources = [],
  userId,
}: {
  course: LearnerCourse;
  module: LearnerModule;
  quiz: LearnerQuiz | null;
  notes: LearnerModuleNote[];
  resources: LearnerModuleResource[];
  userId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [courseModules, setCourseModules] = useState(course.modules ?? []);
  const [watched, setWatched] = useState(
    module.status === "completed" ||
      Number(module.watchedPercent ?? 0) >= 95,
  );
  const videoRef = useRef<HTMLDivElement>(null);
  const [videoHeight, setVideoHeight] = useState<number | undefined>();

  const completedCount = courseModules.filter(
    (m) => m.status === "completed",
  ).length;

  useEffect(() => {
    setCourseModules(course.modules ?? []);
  }, [course.modules]);

  function applyUnlockedCourseState(moduleIdToComplete: string) {
    setCourseModules((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === moduleIdToComplete);

      if (currentIndex === -1) {
        return prev;
      }

      const next = prev.map((item, index) => {
        if (index === currentIndex) {
          return {
            ...item,
            status: "completed" as ModuleStatus,
            watchedPercent: 100,
          };
        }

        if (index === currentIndex + 1 && item.status === "locked") {
          return {
            ...item,
            status: "current" as ModuleStatus,
          };
        }

        return item;
      });

      return next;
    });
  }

  async function refreshCourseModules() {
    try {
      const response = await fetch(`/api/learner/courses/${course.id}`, {
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.course) {
        return;
      }

      setCourseModules(result.course.modules ?? []);
    } catch {
      // Keep the current state if the refresh fails.
    }
  }

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setVideoHeight(height);
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  async function handleFinished() {
    setWatched(true);

    if (!userId) return;

    const response = await fetch(
      `/api/learner/courses/${course.id}/modules/${module.id}/video-progress`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          watchedPercent: 100,
          completed: !module.hasQuiz,
        }),
      },
    );

    const data = await response.json().catch(() => null);

    applyUnlockedCourseState(module.id);
    await refreshCourseModules();
    router.refresh();

    if (!module.hasQuiz && data?.nextModuleId) {
      window.location.href = `/courses/${course.id}/module/${data.nextModuleId}`;
      return;
    }

    if (!module.hasQuiz) {
      window.location.href = `/courses/${course.id}`;
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("learner.moduleDetail.overview") },
    { key: "notes", label: t("learner.moduleDetail.notes") },
    { key: "resources", label: t("learner.moduleDetail.resources") },
    ...(module.hasQuiz
      ? [{ key: "quiz" as Tab, label: t("learner.moduleDetail.quiz") }]
      : []),
  ];

  return (
    <div className="px-6 py-8">
      <Link
        href={`/courses/${course.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        {t("learner.moduleDetail.backToCourse", {
          courseTitle: course.title,
        })}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">
              {t("learner.moduleDetail.courseModuleHeader", {
                courseTitle: course.title.toUpperCase(),
                order: module.order,
              })}
            </p>

            <span className="text-xs font-medium text-muted-foreground">
              {t("learner.moduleDetail.doneCount", {
                completed: completedCount,
                total: courseModules.length,
              })}
            </span>
          </div>

          <VideoPlayer
            ref={videoRef}
            src={module.videoUrl || "/demo_video.mp4"}
            captionsSrc="/demo_video.vtt"
            videoId={module.id}
            userId={userId}
            onFinished={handleFinished}
          />

          <h1 className="mt-4 text-xl font-bold text-card-foreground">
            {module.title}
          </h1>

          <div className="mt-4 flex gap-6 border-b border-border text-sm font-medium text-muted-foreground">
            {tabs.map((tabItem) => (
              <button
                key={tabItem.key}
                onClick={() => setTab(tabItem.key)}
                className={
                  tab === tabItem.key
                    ? "border-b-2 border-primary pb-2 text-primary"
                    : "pb-2 hover:text-card-foreground"
                }
              >
                {tabItem.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "overview" && <OverviewTab module={module} />}
            {tab === "notes" && <NotesTab notes={notes} />}
            {tab === "resources" && <ResourcesTab resources={resources} />}
            {tab === "quiz" && quiz && (
              <QuizTab
                quiz={quiz}
                unlocked={watched}
                userId={userId}
                onPassed={async () => {
                  setWatched(true);
                  applyUnlockedCourseState(module.id);
                  await refreshCourseModules();
                  router.refresh();
                }}
              />
            )}
          </div>
        </div>

        <ModuleContentGrid
          course={{
            ...course,
            modules: courseModules,
          }}
          activeModuleId={module.id}
          maxHeight={videoHeight}
        />
      </div>
    </div>
  );
}
