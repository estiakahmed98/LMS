"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Clock } from "lucide-react";
import { getInitials } from "@/lib/auth";
import type {
  AttendanceStatusValue,
  InstructorAttendanceRow,
  InstructorAttendanceSummary,
  InstructorSession,
} from "@/lib/instructor-types";

function statusClass(status: AttendanceStatusValue) {
  switch (status) {
    case "PRESENT":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "LATE":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "ABSENT":
      return "bg-red-500/10 text-red-600 border-red-500/20";
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InstructorParticipantsPage() {
  const t = useTranslations();
  const [sessions, setSessions] = useState<InstructorSession[]>([]);
  const [attendance, setAttendance] = useState<InstructorAttendanceRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [summary, setSummary] = useState<InstructorAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(sessionId?: string) {
      setLoading(true);
      setError(null);
      try {
        const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
        const res = await fetch(`/api/instructor/participants${qs}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load participants");
        if (cancelled) return;
        setSessions(data.sessions ?? []);
        setAttendance(data.attendance ?? []);
        setSelectedSessionId(data.selectedSessionId ?? "");
        setSummary(data.summary ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load participants");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const isLiveSession = selectedSession?.status === "LIVE";

  const handleSessionChange = useCallback(
    async (sessionId: string, options?: { silent?: boolean }) => {
      setSelectedSessionId(sessionId);
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch(
          `/api/instructor/participants?sessionId=${encodeURIComponent(sessionId)}`,
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load participants");
        setAttendance(data.attendance ?? []);
        if (data.summary) setSummary(data.summary);
      } catch (err) {
        if (!options?.silent) {
          setError(err instanceof Error ? err.message : "Failed to load participants");
        }
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedSessionId || !isLiveSession) return;

    const intervalId = window.setInterval(() => {
      void handleSessionChange(selectedSessionId, { silent: true });
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [handleSessionChange, isLiveSession, selectedSessionId]);

  function handleExport() {
    if (!selectedSession) return;
    const rows = [
      ["Name", "Status", "Join Time", "Leave Time", "Duration (min)"],
      ...attendance.map((a) => [
        a.userName,
        a.status,
        a.joinTime ? new Date(a.joinTime).toLocaleString() : "-",
        a.leaveTime ? new Date(a.leaveTime).toLocaleString() : "-",
        a.durationMinutes?.toString() ?? "-",
      ]),
    ];
    downloadCsv(
      `attendance-${selectedSession.liveClass.title.replace(/\s+/g, "-")}.csv`,
      rows,
    );
  }

  if (loading && sessions.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (error && sessions.length === 0) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("instructor.participants")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("instructorParticipantsPage.subtitle")}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">
              {t("instructorParticipantsPage.summary.totalSessions")}
            </p>
            <p className="mt-1 text-2xl font-bold">{summary.totalSessions}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">
              {t("instructorParticipantsPage.summary.completedSessions")}
            </p>
            <p className="mt-1 text-2xl font-bold">{summary.completedSessions}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">
              {t("instructorParticipantsPage.summary.averageRate")}
            </p>
            <p className="mt-1 text-2xl font-bold">{summary.averageAttendanceRate}%</p>
          </div>
        </div>
      )}

      {summary && summary.byClass.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">{t("instructorParticipantsPage.summary.byClass")}</h2>
          <div className="space-y-2">
            {summary.byClass.slice(0, 5).map((item) => (
              <div key={item.liveClassId} className="flex items-center justify-between text-sm">
                <span>
                  {item.title} · {item.batchName}
                </span>
                <span className="text-muted-foreground">
                  {item.sessionsHeld} sessions · {item.averageAttendanceRate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <select
          value={selectedSessionId}
          onChange={(e) => void handleSessionChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-md"
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.liveClass.title} ·{" "}
              {new Date(session.scheduledStart).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </option>
          ))}
        </select>

        <button
          onClick={handleExport}
          disabled={!selectedSession}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-semibold disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {t("common.export")}
        </button>
      </div>

      {selectedSession && isLiveSession && (
        <p className="text-xs text-muted-foreground -mt-2">
          {t("instructorParticipantsPage.liveRefresh")}
        </p>
      )}

      {selectedSession && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  {t("instructorParticipantsPage.table.student")}
                </th>
                <th className="px-4 py-3">
                  {t("instructorParticipantsPage.table.status")}
                </th>
                <th className="px-4 py-3">
                  {t("instructorParticipantsPage.table.joinTime")}
                </th>
                <th className="px-4 py-3">
                  {t("instructorParticipantsPage.table.leaveTime")}
                </th>
                <th className="px-4 py-3">
                  {t("instructorParticipantsPage.table.duration")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendance.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold">
                        {getInitials(a.userName)}
                      </span>
                      <span className="font-medium text-card-foreground">
                        {a.userName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusClass(a.status)}`}
                    >
                      {t(`liveClass.attendance.${a.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.joinTime
                      ? new Date(a.joinTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.leaveTime
                      ? new Date(a.leaveTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.durationMinutes ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {a.durationMinutes} min
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendance.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("instructorParticipantsPage.empty")}
            </p>
          )}
        </div>
      )}

      {!selectedSession && !loading && (
        <p className="text-center text-muted-foreground py-12">
          {t("instructorParticipantsPage.empty")}
        </p>
      )}
    </div>
  );
}
