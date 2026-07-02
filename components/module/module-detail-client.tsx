"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type {
  UiCourse,
  UiModule,
  Quiz,
  ModuleNote,
  ModuleResource,
} from "@/lib/mock-modules";
import { markModuleWatched } from "@/lib/mock-modules";
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
  notes,
  resources,
  userId,
}: {
  course: UiCourse;
  module: UiModule;
  quiz: Quiz | null;
  notes: ModuleNote[];
  resources: ModuleResource[];
  userId: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [watched, setWatched] = useState(module.status === "completed");
  const videoRef = useRef<HTMLDivElement>(null);
  const [videoHeight, setVideoHeight] = useState<number | undefined>();

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

  function handleFinished() {
    setWatched(true);
    if (userId) {
      markModuleWatched(course.id, module.id, userId);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "resources", label: "Resources" },
    ...(module.hasQuiz ? [{ key: "quiz" as Tab, label: "Quiz" }] : []),
  ];

  return (
    <div className="px-6 py-8">
      <Link
        href={`/courses/${course.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        Back to {course.title}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT: video + content */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary">
              {course.title.toUpperCase()} — MODULE {module.order}
            </p>
            <span className="text-xs font-medium text-muted-foreground">
              {course.modules.filter((m) => m.status === "completed").length} /{" "}
              {course.modules.length} done
            </span>
          </div>

          <VideoPlayer
            ref={videoRef}
            durationMinutes={module.durationMinutes}
            watched={watched}
            onFinished={handleFinished}
          />

          <h1 className="mt-4 text-xl font-bold text-card-foreground">
            {module.title}
          </h1>

          <div className="mt-4 flex gap-6 border-b border-border text-sm font-medium text-muted-foreground">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? "border-b-2 border-primary pb-2 text-primary"
                    : "pb-2 hover:text-card-foreground"
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "overview" && <OverviewTab module={module} />}
            {tab === "notes" && <NotesTab notes={notes} />}
            {tab === "resources" && <ResourcesTab resources={resources} />}
            {tab === "quiz" && quiz && (
              <QuizTab quiz={quiz} unlocked={watched} />
            )}
          </div>
        </div>

        {/* RIGHT: course content thumbnail grid */}
        <ModuleContentGrid
          course={course}
          activeModuleId={module.id}
          maxHeight={videoHeight}
        />
      </div>
    </div>
  );
}
