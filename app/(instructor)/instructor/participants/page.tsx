"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Clock } from "lucide-react";
import { getCurrentUser, getInitials } from "@/lib/auth";
import {
  getAttendanceBySessionId,
  getLiveClassById,
  getSessionsByInstructorId,
  getUserById,
  type AttendanceStatus,
} from "@/lib/mock-data";

function statusClass(status: AttendanceStatus) {
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
  const currentUser = getCurrentUser();
  const instructorId = currentUser?.id ?? "";

  const sessions = getSessionsByInstructorId(instructorId)
    .filter((s) => s.status === "COMPLETED" || s.status === "LIVE")
    .sort((a, b) => b.scheduledStart.getTime() - a.scheduledStart.getTime());

  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? "");
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const liveClass = selectedSession ? getLiveClassById(selectedSession.liveClassId) : undefined;

  const attendance = useMemo(
    () => (selectedSession ? getAttendanceBySessionId(selectedSession.id) : []),
    [selectedSession],
  );

  function handleExport() {
    if (!selectedSession || !liveClass) return;
    const rows = [
      ["Name", "Status", "Join Time", "Leave Time", "Duration (min)", "Speak Time (s)"],
      ...attendance.map((a) => {
        const user = getUserById(a.userId);
        return [
          user?.name ?? a.userId,
          a.status,
          a.joinTime ? a.joinTime.toLocaleString() : "-",
          a.leaveTime ? a.leaveTime.toLocaleString() : "-",
          a.durationMinutes?.toString() ?? "-",
          a.speakTimeSeconds?.toString() ?? "-",
        ];
      }),
    ];
    downloadCsv(`attendance-${liveClass.title.replace(/\s+/g, "-")}.csv`, rows);
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("instructor.participants")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("instructorParticipantsPage.subtitle")}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-md"
        >
          {sessions.map((session) => {
            const cls = getLiveClassById(session.liveClassId);
            return (
              <option key={session.id} value={session.id}>
                {cls?.title} ·{" "}
                {session.scheduledStart.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </option>
            );
          })}
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

      {liveClass && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("instructorParticipantsPage.table.student")}</th>
                <th className="px-4 py-3">{t("instructorParticipantsPage.table.status")}</th>
                <th className="px-4 py-3">{t("instructorParticipantsPage.table.joinTime")}</th>
                <th className="px-4 py-3">{t("instructorParticipantsPage.table.leaveTime")}</th>
                <th className="px-4 py-3">{t("instructorParticipantsPage.table.duration")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendance.map((a) => {
                const user = getUserById(a.userId);
                if (!user) return null;
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold">
                          {getInitials(user.name)}
                        </span>
                        <span className="font-medium text-card-foreground">{user.name}</span>
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
                        ? a.joinTime.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.leaveTime
                        ? a.leaveTime.toLocaleTimeString("en-US", {
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
                );
              })}
            </tbody>
          </table>
          {attendance.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("instructorParticipantsPage.empty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
