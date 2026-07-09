"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Video, Users, Clock, PlayCircle } from "lucide-react";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";
import type { SessionStatusValue } from "@/lib/instructor-types";
import { useInstructorSessions } from "@/lib/use-instructor-sessions";

type FilterTab = "ALL" | "UPCOMING" | "LIVE" | "COMPLETED" | "MISSED";

function statusBadgeClass(status: SessionStatusValue) {
  switch (status) {
    case "LIVE":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "UPCOMING":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "COMPLETED":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "MISSED":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function InstructorClassesPage() {
  const t = useTranslations();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);
  const { sessions, loading, error, startSession } = useInstructorSessions();

  const filteredRows = useMemo(() => {
    if (filter === "ALL") return sessions;
    return sessions.filter((session) => session.status === filter);
  }, [sessions, filter]);
  const playingSession = sessions.find((session) => session.id === playingSessionId) ?? null;

  async function handleStart(sessionId: string) {
    try {
      await startSession(sessionId);
      window.location.href = `/live/${sessionId}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start session");
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: t("common.all") },
    { key: "UPCOMING", label: t("liveClass.status.UPCOMING") },
    { key: "LIVE", label: t("liveClass.status.LIVE") },
    { key: "COMPLETED", label: t("liveClass.status.COMPLETED") },
    { key: "MISSED", label: t("liveClass.status.MISSED") },
  ];

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("instructor.myTeachingClasses")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("instructorClassesPage.subtitle")}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRows.map((session) => (
          <div
            key={session.id}
            className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-card-foreground">
                  {session.liveClass.title}
                </h3>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${statusBadgeClass(session.status)}`}
                >
                  {t(`liveClass.status.${session.status}`)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {session.liveClass.subjectName}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(session.scheduledStart).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {session.liveClass.batchName}
                </span>
              </div>
              {session.status === "LIVE" ? (
                <Link
                  href={`/live/${session.id}`}
                  className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("instructorDashboard.rejoinAsHost")}
                </Link>
              ) : session.status === "UPCOMING" ? (
                <button
                  type="button"
                  onClick={() => void handleStart(session.id)}
                  className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
                >
                  <Video className="w-4 h-4" />
                  {t("instructorDashboard.startLiveClass")}
                </button>
              ) : session.recordingUrl ? (
                <button
                  type="button"
                  onClick={() => setPlayingSessionId(session.id)}
                  className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("instructorClassesPage.viewRecording")}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filteredRows.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {t("instructorClassesPage.empty")}
        </p>
      )}

      {playingSession?.recordingUrl && (
        <RecordingPlayerModal
          title={playingSession.liveClass.title}
          src={playingSession.recordingUrl}
          videoId={playingSession.id}
          userId=""
          onClose={() => setPlayingSessionId(null)}
        />
      )}
    </div>
  );
}
