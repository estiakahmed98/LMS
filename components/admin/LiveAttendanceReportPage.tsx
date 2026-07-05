"use client";

import { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";
import { getInitials } from "@/lib/auth";
import {
  getLiveClassById,
  getUserById,
  mockLiveClassAttendance,
  mockLiveClassSessions,
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

export default function LiveAttendanceReportPage() {
  const t = useTranslations("adminLiveAttendancePage");
  const tAdmin = useTranslations("admin");
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">("ALL");

  const rows = useMemo(
    () =>
      mockLiveClassAttendance
        .map((attendance) => {
          const session = mockLiveClassSessions.find((s) => s.id === attendance.sessionId);
          const liveClass = session ? getLiveClassById(session.liveClassId) : undefined;
          const user = getUserById(attendance.userId);
          return { attendance, session, liveClass, user };
        })
        .filter((row) => row.session && row.liveClass && row.user),
    [],
  );

  const filteredRows = rows.filter(
    (row) => statusFilter === "ALL" || row.attendance.status === statusFilter,
  );

  function handleExport() {
    const csvRows = [
      ["Class", "Student", "Status", "Join Time", "Leave Time", "Duration (min)"],
      ...filteredRows.map(({ liveClass, user, attendance }) => [
        liveClass?.title ?? "",
        user?.name ?? "",
        attendance.status,
        attendance.joinTime ? attendance.joinTime.toLocaleString() : "-",
        attendance.leaveTime ? attendance.leaveTime.toLocaleString() : "-",
        attendance.durationMinutes?.toString() ?? "-",
      ]),
    ];
    downloadCsv("live-class-attendance.csv", csvRows);
  }

  return (
    <AdminLayout title={tAdmin("liveAttendanceReport")}>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">{tAdmin("liveAttendanceReport")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            {t("export")}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["ALL", "PRESENT", "LATE", "ABSENT"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {status === "ALL" ? t("filters.all") : t(`status.${status}`)}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("table.class")}</th>
                <th className="px-4 py-3">{t("table.student")}</th>
                <th className="px-4 py-3">{t("table.status")}</th>
                <th className="px-4 py-3">{t("table.joinTime")}</th>
                <th className="px-4 py-3">{t("table.leaveTime")}</th>
                <th className="px-4 py-3">{t("table.duration")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map(({ attendance, liveClass, user }) => (
                <tr key={attendance.id}>
                  <td className="px-4 py-3 font-medium text-card-foreground">{liveClass?.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold">
                        {getInitials(user?.name ?? "?")}
                      </span>
                      {user?.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full border ${statusClass(attendance.status)}`}
                    >
                      {t(`status.${attendance.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {attendance.joinTime
                      ? attendance.joinTime.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {attendance.leaveTime
                      ? attendance.leaveTime.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {attendance.durationMinutes ? `${attendance.durationMinutes} min` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRows.length === 0 && (
            <p className="text-center text-muted-foreground py-12">{t("empty")}</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
