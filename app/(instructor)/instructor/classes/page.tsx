"use client";

import { instructorFetch as fetch } from "@/lib/admin-swr";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Video,
  Users,
  Clock,
  PlayCircle,
  CalendarClock,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Square,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Timer,
  Percent,
} from "lucide-react";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";
import CreateClassModal from "@/components/instructor/CreateClassModal";
import EditClassModal from "@/components/instructor/EditClassModal";
import type {
  InstructorSession,
  SessionStatusValue,
} from "@/lib/instructor-types";
import { parseApiJson } from "@/lib/parse-api-json";
import { useInstructorSessions } from "@/lib/use-instructor-sessions";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

type FilterTab = "ALL" | "UPCOMING" | "LIVE" | "COMPLETED" | "MISSED";
type SortOrder = "RECOMMENDED" | "NEWEST" | "OLDEST";

const PAGE_SIZE = 15;

const statusPriority: Record<SessionStatusValue, number> = {
  LIVE: 0,
  UPCOMING: 1,
  MISSED: 2,
  CANCELLED: 3,
  COMPLETED: 4,
};

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

function completedSessionMetrics(session: InstructorSession) {
  const present = session.presentCount ?? session.attendeeCount;
  const late = session.lateCount ?? 0;
  const absent = session.absentCount ?? 0;
  const attended = present + late;
  const marked = attended + absent;
  const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : 0;
  const start = session.actualStart
    ? new Date(session.actualStart).getTime()
    : new Date(session.scheduledStart).getTime();
  const end = session.actualEnd
    ? new Date(session.actualEnd).getTime()
    : new Date(session.scheduledEnd).getTime();
  const durationMinutes = Math.max(0, Math.round((end - start) / 60_000));

  return { attended, absent, late, attendanceRate, durationMinutes };
}

export default function InstructorClassesPage() {
  const t = useTranslations();
  const { can } = usePortalPermissions();
  const canCreate = can("COURSES", "create");
  const canEdit = can("COURSES", "edit");
  const canDelete = can("COURSES", "delete");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("RECOMMENDED");
  const [page, setPage] = useState(1);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);
  const [rescheduleSession, setRescheduleSession] =
    useState<InstructorSession | null>(null);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editClassId, setEditClassId] = useState<string | null>(null);
  const {
    sessions,
    loading,
    error,
    startSession,
    cancelSession,
    endSession,
    rescheduleSession: saveReschedule,
    reload,
  } = useInstructorSessions();

  const filteredRows = useMemo(() => {
    const rows =
      filter === "ALL"
        ? [...sessions]
        : sessions.filter((session) => session.status === filter);

    return rows.sort((a, b) => {
      const aTime = new Date(a.scheduledStart).getTime();
      const bTime = new Date(b.scheduledStart).getTime();

      if (sortOrder === "OLDEST") return aTime - bTime;
      if (sortOrder === "NEWEST" || filter !== "ALL") return bTime - aTime;

      const priorityDifference =
        statusPriority[a.status] - statusPriority[b.status];
      return priorityDifference || bTime - aTime;
    });
  }, [sessions, filter, sortOrder]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const playingSession =
    sessions.find((session) => session.id === playingSessionId) ?? null;

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
      alert(
        err instanceof Error ? err.message : "Failed to reschedule session",
      );
    } finally {
      setActionBusy(false);
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: t("common.all") },
    { key: "LIVE", label: t("liveClass.status.LIVE") },
    { key: "UPCOMING", label: t("liveClass.status.UPCOMING") },
    { key: "MISSED", label: t("liveClass.status.MISSED") },
    { key: "COMPLETED", label: t("liveClass.status.COMPLETED") },
  ];

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t("instructor.myTeachingClasses")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("instructorClassesPage.subtitle")}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            {t("instructorClassesPage.create.button")}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <ArrowUpDown className="h-4 w-4" />
          <span className="sr-only">Sort classes</span>
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value as SortOrder);
              setPage(1);
            }}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            aria-label="Sort classes"
          >
            <option value="RECOMMENDED">
              {filter === "ALL" ? "Live & upcoming first" : "Newest first"}
            </option>
            <option value="NEWEST">Newest first</option>
            <option value="OLDEST">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedRows.map((session) => (
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
              {session.status === "COMPLETED" &&
                (() => {
                  const metrics = completedSessionMetrics(session);

                  return (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-emerald-500/10 p-2.5">
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-semibold uppercase tracking-wide">
                              Attended
                            </span>
                          </div>
                          <p className="mt-1 text-lg font-bold">
                            {metrics.attended}
                          </p>
                          {metrics.late > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              Includes {metrics.late} late
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg bg-red-500/10 p-2.5">
                          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                            <UserX className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-semibold uppercase tracking-wide">
                              Absent
                            </span>
                          </div>
                          <p className="mt-1 text-lg font-bold">
                            {metrics.absent}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-muted-foreground">
                          <Percent className="h-3.5 w-3.5 text-primary" />
                          <span>
                            <strong className="text-foreground">
                              {metrics.attendanceRate}%
                            </strong>{" "}
                            attendance
                          </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-muted-foreground">
                          <Timer className="h-3.5 w-3.5 text-primary" />
                          <span>
                            <strong className="text-foreground">
                              {metrics.durationMinutes}
                            </strong>{" "}
                            minutes
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {session.status === "LIVE" ? (
                <div className="space-y-2 mt-2">
                  <Link
                    href={`/live/${session.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {t("instructorDashboard.rejoinAsHost")}
                  </Link>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleEnd(session.id)}
                      disabled={actionBusy}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/10 transition-colors font-semibold text-sm disabled:opacity-50"
                    >
                      <Square className="w-4 h-4" />
                      {t("instructorClassesPage.endSession.button")}
                    </button>
                  )}
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
                  {canEdit && (
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
                  )}
                  {(canEdit || canDelete) && (
                    <div className="grid grid-cols-2 gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditClassId(session.liveClassId)}
                          disabled={actionBusy}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-xs font-semibold disabled:opacity-50"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {t("instructorClassesPage.edit.button")}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteClass(session.liveClassId)
                          }
                          disabled={actionBusy}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/10 transition-colors text-xs font-semibold disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("instructorClassesPage.delete.button")}
                        </button>
                      )}
                    </div>
                  )}
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

      {filteredRows.length > PAGE_SIZE && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of{" "}
            {filteredRows.length.toLocaleString()} classes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="min-w-20 text-center text-sm font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
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

      {canEdit && rescheduleSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold">
              {t("instructorClassesPage.rescheduleTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {rescheduleSession.liveClass.title}
            </p>
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

      {canCreate && (
        <CreateClassModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            void reload();
          }}
        />
      )}

      {canEdit && (
        <EditClassModal
          classId={editClassId}
          open={Boolean(editClassId)}
          onClose={() => setEditClassId(null)}
          onSaved={() => {
            void reload();
          }}
        />
      )}
    </div>
  );
}
