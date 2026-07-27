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
import YouTubePlayer from "@/components/shared/YouTubePlayer";
import ModuleContentGrid from "@/components/module/module-content-grid";
import OverviewTab from "@/components/module/overview-tab";
import NotesTab from "@/components/module/notes-tab";
import ResourcesTab from "@/components/module/resources-tab";
import QuizTab from "@/components/module/quiz-tab";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";
import { useModuleUnlock } from "@/lib/use-module-unlock";

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
  const { can } = usePortalPermissions();
  // Recording your own progress only needs course *view* access — it is not a
  // course edit. Gating this on "edit" silently disabled progress tracking
  // for every student, since students have view-only access to courses.
  const canUpdateProgress = can("COURSES", "view");
  const canViewAssessments = can("ASSESSMENTS", "view");
  const canSubmitQuiz = can("ASSESSMENTS", "create");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [courseModules, setCourseModules] = useState(course.modules ?? []);
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

  const [nextModuleId, setNextModuleId] = useState<string | null>(null);

  // Modules with a video complete by watched percentage — both the
  // uploaded-file player and the YouTube player report real position and
  // length. Modules with nothing to play fall back to a server-side timer.
  const unlock = useModuleUnlock({
    courseId: course.id,
    moduleId: module.id,
    hasMeasurableVideo: module.hasMeasurableVideo,
    initialRemainingSeconds: module.remainingUnlockSeconds ?? 0,
    unlockDelaySeconds: module.unlockDelaySeconds ?? 60,
    initialWatchedPercent: module.watchedPercent ?? 0,
    alreadyCompleted: module.status === "completed",
    enabled: canUpdateProgress && Boolean(userId),
    onCompleted: async ({ moduleCompleted, nextModuleId }) => {
      applyUnlockedCourseState(module.id);
      await refreshCourseModules();
      router.refresh();

      // Deliberately no auto-redirect: the learner may still be watching when
      // the timer fires. The next module is unlocked and offered as a button.
      if (moduleCompleted && nextModuleId) {
        setNextModuleId(nextModuleId);
      }
    },
  });

  // The quiz opens on the same timer that completes the module.
  const watched = unlock.completed;

  // Uploaded files are the only source whose length we can actually measure.
  // Save it once so every course card can show a real duration.
  const reportedDurationRef = useRef(false);

  async function reportMeasuredDuration(durationSeconds: number) {
    if (reportedDurationRef.current || !canUpdateProgress || !userId) return;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

    reportedDurationRef.current = true;

    try {
      await fetch(
        `/api/learner/courses/${course.id}/modules/${module.id}/duration`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationSeconds }),
        },
      );
    } catch {
      // A missing duration only costs us the chip; never block playback.
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: t("learner.moduleDetail.overview") },
    { key: "notes", label: t("learner.moduleDetail.notes") },
    { key: "resources", label: t("learner.moduleDetail.resources") },
    ...(module.hasQuiz && canViewAssessments
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

          {module.youtubeVideoId ? (
            <div ref={videoRef}>
              {/* The IFrame API reports real position and length, so YouTube
                  modules track genuine watch percentage just like uploaded
                  files — same 80% rule, same 30s position sync. */}
              <YouTubePlayer
                videoId={module.youtubeVideoId}
                resumePositionSeconds={module.positionSeconds}
                onDurationMeasured={reportMeasuredDuration}
                onProgress={unlock.reportProgress}
              />
            </div>
          ) : (
            <VideoPlayer
              ref={videoRef}
              src={module.videoUrl || "/demo_video.mp4"}
              captionsSrc="/demo_video.vtt"
              videoId={module.id}
              userId={userId}
              // Resume from the server's last saved position rather than
              // localStorage, so a crash, a closed tab, or a different device
              // all pick up from the same spot.
              resumePositionSeconds={module.positionSeconds}
              // An uploaded file knows its own length; record it once so the
              // course cards can show a real duration for this module.
              onDurationMeasured={reportMeasuredDuration}
              // Position + watched percent, saved to the server every ~30s
              // and on pause/unmount/tab-close. Crossing 80% completes the
              // module and unlocks the next one.
              onProgress={unlock.reportProgress}
            />
          )}

          {/* Unlock indicator. Modules with a video track watched percent
              toward 80%; modules with nothing to play show the server-side
              wait timer instead. Either way progress is tracked server-side,
              so leaving and coming back never costs what was already done. */}
          {!unlock.completed && canUpdateProgress && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-card-foreground">
                  {module.hasMeasurableVideo
                    ? t("learner.moduleDetail.watchProgress", {
                        percent: Math.round(unlock.watchedPercent),
                      })
                    : t("learner.moduleDetail.unlockCountdown", {
                        seconds: unlock.remainingSeconds,
                      })}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {module.hasMeasurableVideo
                    ? `${Math.round(unlock.watchedPercent)}%`
                    : `${unlock.remainingSeconds}s`}
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                  style={{ width: `${unlock.progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {unlock.completed && module.hasQuiz && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-card-foreground">
              {t("learner.moduleDetail.quizRequired")}
            </div>
          )}

          {/* The next module is unlocked, but the learner may still be
              watching — let them move on when they are ready. */}
          {nextModuleId && (
            <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
              <span className="text-sm font-medium text-card-foreground">
                {t("learner.moduleDetail.nextModuleUnlocked")}
              </span>

              <Link
                href={`/courses/${course.id}/module/${nextModuleId}`}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t("learner.moduleDetail.goToNextModule")}
              </Link>
            </div>
          )}

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
                  if (!canSubmitQuiz) return;

                  // Passing the quiz is what finishes a quiz module. QuizTab
                  // handles moving on to the next module itself.
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
