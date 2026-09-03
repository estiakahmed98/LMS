"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Download, Clock } from "lucide-react";
import { getInitials } from "@/lib/auth";
import type {
  AttendanceStatusValue,
  InstructorAttendanceRow,
  InstructorAttendanceSummary,
  InstructorPagination,
  InstructorParticipantsPayload,
  InstructorSession,
} from "@/lib/instructor-types";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

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
  const csv = rows
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const ATTENDANCE_PAGE_SIZE = 50;
const SESSION_PAGE_SIZE = 50;
const EMPTY_PAGINATION: InstructorPagination = {
  page: 1,
  pageSize: ATTENDANCE_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

export default function InstructorParticipantsPage() {
  const t = useTranslations();
  const { can } = usePortalPermissions();
  const canExport = can("REPORTS", "export");
  const [sessions, setSessions] = useState<InstructorSession[]>([]);
  const [attendance, setAttendance] = useState<InstructorAttendanceRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [summary, setSummary] = useState<InstructorAttendanceSummary | null>(
    null,
  );
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [sessionPagination, setSessionPagination] = useState({
    ...EMPTY_PAGINATION,
    pageSize: SESSION_PAGE_SIZE,
  });
  const [historyYears, setHistoryYears] = useState(10);
  const [filterOptions, setFilterOptions] = useState<
    NonNullable<InstructorParticipantsPayload["filters"]>
  >({ classes: [], groups: [] });
  const [classFilter, setClassFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [appliedClassFilter, setAppliedClassFilter] = useState("");
  const [appliedGroupFilter, setAppliedGroupFilter] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [appliedStudentQuery, setAppliedStudentQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadParticipants = useCallback(
    async ({
      sessionId,
      page = 1,
      sessionPage = 1,
      silent = false,
      liveClassId = "",
      group = "",
      student = "",
    }: {
      sessionId?: string;
      page?: number;
      sessionPage?: number;
      silent?: boolean;
      liveClassId?: string;
      group?: string;
      student?: string;
    } = {}) => {
      const sequence = ++requestSequence.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(ATTENDANCE_PAGE_SIZE),
          sessionPage: String(sessionPage),
          sessionPageSize: String(SESSION_PAGE_SIZE),
          includeSummary: String(
            !sessionId &&
              page === 1 &&
              sessionPage === 1 &&
              !liveClassId &&
              !group &&
              !student,
          ),
          includeFilters: String(
            !sessionId &&
              page === 1 &&
              sessionPage === 1 &&
              !liveClassId &&
              !group &&
              !student,
          ),
        });
        if (sessionId) params.set("sessionId", sessionId);
        if (liveClassId) params.set("liveClassId", liveClassId);
        if (group) params.set("group", group);
        if (student) params.set("student", student);
        const res = await fetch(`/api/instructor/participants?${params}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as InstructorParticipantsPayload & {
          error?: string;
        };
        if (!res.ok)
          throw new Error(data.error ?? "Failed to load participants");
        if (sequence !== requestSequence.current) return;
        setSessions(data.sessions ?? []);
        setAttendance(data.attendance ?? []);
        setSelectedSessionId(data.selectedSessionId ?? "");
        if (data.summary) setSummary(data.summary);
        setPagination(data.pagination ?? EMPTY_PAGINATION);
        setSessionPagination(
          data.sessionPagination ?? {
            ...EMPTY_PAGINATION,
            pageSize: SESSION_PAGE_SIZE,
          },
        );
        setHistoryYears(data.range?.years ?? 10);
        if (data.filters) setFilterOptions(data.filters);
      } catch (err) {
        if (sequence === requestSequence.current && !silent) {
          setError(
            err instanceof Error ? err.message : "Failed to load participants",
          );
        }
      } finally {
        if (sequence === requestSequence.current && !silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const isLiveSession = selectedSession?.status === "LIVE";

  useEffect(() => {
    if (!selectedSessionId || !isLiveSession) return;

    const intervalId = window.setInterval(() => {
      void loadParticipants({
        sessionId: selectedSessionId,
        page: pagination.page,
        sessionPage: sessionPagination.page,
        silent: true,
        liveClassId: appliedClassFilter,
        group: appliedGroupFilter,
        student: appliedStudentQuery,
      });
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [
    isLiveSession,
    appliedStudentQuery,
    appliedClassFilter,
    appliedGroupFilter,
    loadParticipants,
    pagination.page,
    selectedSessionId,
    sessionPagination.page,
  ]);

  function handleExport() {
    if (!canExport || !selectedSession) return;
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
      `attendance-${selectedSession.liveClass.title.replace(/\s+/g, "-")}-page-${pagination.page}.csv`,
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
          {t("instructorParticipantsPage.subtitle")} Showing up to{" "}
          {historyYears} years of history.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
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
            <p className="mt-1 text-2xl font-bold">
              {summary.completedSessions}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase text-muted-foreground">
              {t("instructorParticipantsPage.summary.averageRate")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {summary.averageAttendanceRate}%
            </p>
          </div>
        </div>
      )}

      {summary && summary.byClass.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold">
            {t("instructorParticipantsPage.summary.byClass")}
          </h2>
          <div className="space-y-2">
            {summary.byClass.slice(0, 5).map((item) => (
              <div
                key={item.liveClassId}
                className="flex items-center justify-between text-sm"
              >
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

      <form
        className="rounded-xl border border-border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const student = studentQuery.trim();
          setAppliedClassFilter(classFilter);
          setAppliedGroupFilter(groupFilter);
          setAppliedStudentQuery(student);
          void loadParticipants({
            liveClassId: classFilter,
            group: groupFilter,
            student,
          });
        }}
      >
        <div className="mb-3">
          <h2 className="font-semibold text-card-foreground">
            Filter attendance
          </h2>
          <p className="text-xs text-muted-foreground">
            Find sessions by class or group, then search participants by name or
            email.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto_auto]">
          <select
            aria-label="Filter by class"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">All classes</option>
            {filterOptions.classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by group"
            value={groupFilter}
            onChange={(event) => setGroupFilter(event.target.value)}
            className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="">All groups</option>
            {filterOptions.groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={studentQuery}
            onChange={(event) => setStudentQuery(event.target.value)}
            placeholder="Student name or email"
            className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            disabled={
              loading ||
              (!classFilter &&
                !groupFilter &&
                !appliedClassFilter &&
                !appliedGroupFilter &&
                !studentQuery &&
                !appliedStudentQuery)
            }
            onClick={() => {
              setClassFilter("");
              setGroupFilter("");
              setAppliedClassFilter("");
              setAppliedGroupFilter("");
              setStudentQuery("");
              setAppliedStudentQuery("");
              void loadParticipants();
            }}
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select
            value={selectedSessionId}
            onChange={(e) =>
              void loadParticipants({
                sessionId: e.target.value,
                page: 1,
                sessionPage: sessionPagination.page,
                liveClassId: appliedClassFilter,
                group: appliedGroupFilter,
                student: appliedStudentQuery,
              })
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm sm:max-w-xl"
          >
            {sessions.length === 0 ? (
              <option value="">No sessions found</option>
            ) : null}
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.liveClass.title} ·{" "}
                {new Date(session.scheduledStart).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </option>
            ))}
          </select>

          {canExport && (
            <button
              onClick={handleExport}
              disabled={!selectedSession || attendance.length === 0}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export current page
            </button>
          )}
        </div>

        {sessionPagination.totalPages > 1 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Session history page {sessionPagination.page} of{" "}
              {sessionPagination.totalPages} ·{" "}
              {sessionPagination.total.toLocaleString()} sessions
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || sessionPagination.page <= 1}
                onClick={() =>
                  void loadParticipants({
                    sessionPage: sessionPagination.page - 1,
                    liveClassId: appliedClassFilter,
                    group: appliedGroupFilter,
                    student: appliedStudentQuery,
                  })
                }
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted disabled:opacity-50 sm:flex-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Newer
              </button>
              <button
                type="button"
                disabled={
                  loading ||
                  sessionPagination.page >= sessionPagination.totalPages
                }
                onClick={() =>
                  void loadParticipants({
                    sessionPage: sessionPagination.page + 1,
                    liveClassId: appliedClassFilter,
                    group: appliedGroupFilter,
                    student: appliedStudentQuery,
                  })
                }
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted disabled:opacity-50 sm:flex-none"
              >
                Older <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSession && isLiveSession && (
        <p className="text-xs text-muted-foreground -mt-2">
          {t("instructorParticipantsPage.liveRefresh")}
        </p>
      )}

      {selectedSession && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
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
          </div>
          {attendance.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("instructorParticipantsPage.empty")}
            </p>
          )}
          {pagination.total > 0 && (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )}{" "}
                of {pagination.total.toLocaleString()} participants
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading || pagination.page <= 1}
                  onClick={() =>
                    void loadParticipants({
                      sessionId: selectedSessionId,
                      page: pagination.page - 1,
                      sessionPage: sessionPagination.page,
                      liveClassId: appliedClassFilter,
                      group: appliedGroupFilter,
                      student: appliedStudentQuery,
                    })
                  }
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50 sm:flex-none"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <span className="min-w-24 text-center text-xs font-medium text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={loading || pagination.page >= pagination.totalPages}
                  onClick={() =>
                    void loadParticipants({
                      sessionId: selectedSessionId,
                      page: pagination.page + 1,
                      sessionPage: sessionPagination.page,
                      liveClassId: appliedClassFilter,
                      group: appliedGroupFilter,
                      student: appliedStudentQuery,
                    })
                  }
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50 sm:flex-none"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
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
