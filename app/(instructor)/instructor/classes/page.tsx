"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Video, Users, Clock, PlayCircle, CalendarClock, XCircle, Plus, Pencil, Trash2, Square } from "lucide-react";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";
import CreateClassModal from "@/components/instructor/CreateClassModal";
import EditClassModal from "@/components/instructor/EditClassModal";
import type { InstructorSession, SessionStatusValue } from "@/lib/instructor-types";
import { parseApiJson } from "@/lib/parse-api-json";
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
  const [rescheduleSession, setRescheduleSession] = useState<InstructorSession | null>(null);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const { sessions, loading, error, startSession, cancelSession, endSession, rescheduleSession: saveReschedule, reload } =
    useInstructorSessions();

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

  async function handleEnd(sessionId: string) {
    if (!window.confirm(t("instructorClassesPage.endSession.confirm"))) return;
    setActionBusy(true);
    try {
      await endSession(sessionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteClass(liveClassId: string) {
    if (!window.confirm(t("instructorClassesPage.delete.confirm"))) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/instructor/classes/${liveClassId}`, {
        method: "DELETE",
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to delete class");
      }
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete class");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancel(sessionId: string) {
    if (!window.confirm(t("instructorClassesPage.cancelConfirm"))) return;
    setActionBusy(true);
    try {
      await cancelSession(sessionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to cancel session");
    } finally {
      setActionBusy(false);
    }
  }

  function openReschedule(session: InstructorSession) {
    const toLocalInput = (iso: string) => {
      const date = new Date(iso);
      const offset = date.getTimezoneOffset();
      const local = new Date(date.getTime() - offset * 60_000);
      return local.toISOString().slice(0, 16);
    };
    setRescheduleSession(session);
    setScheduleStart(toLocalInput(session.scheduledStart));
    setScheduleEnd(toLocalInput(session.scheduledEnd));
  }

  async function handleSaveReschedule() {
    if (!rescheduleSession) return;
    setActionBusy(true);
    try {
      await saveReschedule(
        rescheduleSession.id,
        new Date(scheduleStart).toISOString(),
        new Date(scheduleEnd).toISOString(),
      );
      setRescheduleSession(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reschedule session");
    } finally {
      setActionBusy(false);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("instructor.myTeachingClasses")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("instructorClassesPage.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {t("instructorClassesPage.create.button")}
        </button>
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
                <div className="space-y-2 mt-2">
                  <Link
                    href={`/live/${session.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {t("instructorDashboard.rejoinAsHost")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleEnd(session.id)}
                    disabled={actionBusy}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/10 transition-colors font-semibold text-sm disabled:opacity-50"
                  >
                    <Square className="w-4 h-4" />
                    {t("instructorClassesPage.endSession.button")}
                  </button>
                </div>
              ) : session.status === "UPCOMING" ? (
                <div className="space-y-2 mt-2">
                  <button
                    type="button"
                    onClick={() => void handleStart(session.id)}
                    disabled={actionBusy}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm disabled:opacity-50"
                  >
                    <Video className="w-4 h-4" />
                    {t("instructorDashboard.startLiveClass")}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openReschedule(session)}
                      disabled={actionBusy}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      {t("instructorClassesPage.rescheduleSession")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCancel(session.id)}
                      disabled={actionBusy}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/10 transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      {t("instructorClassesPage.cancelSession")}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditClassId(session.liveClassId)}
                      disabled={actionBusy}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {t("instructorClassesPage.edit.button")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteClass(session.liveClassId)}
                      disabled={actionBusy}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/10 transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("instructorClassesPage.delete.button")}
                    </button>
                  </div>
                </div>
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

      {rescheduleSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">{t("instructorClassesPage.rescheduleTitle")}</h2>
            <p className="text-sm text-muted-foreground">{rescheduleSession.liveClass.title}</p>
            <label className="block text-sm space-y-1">
              <span>{t("instructorClassesPage.startTime")}</span>
              <input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm space-y-1">
              <span>{t("instructorClassesPage.endTime")}</span>
              <input
                type="datetime-local"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleSession(null)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void handleSaveReschedule()}
                disabled={actionBusy || !scheduleStart || !scheduleEnd}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {t("instructorClassesPage.saveSchedule")}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateClassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void reload();
        }}
      />

      <EditClassModal
        classId={editClassId}
        open={Boolean(editClassId)}
        onClose={() => setEditClassId(null)}
        onSaved={() => {
          void reload();
        }}
      />
    </div>
  );
}
