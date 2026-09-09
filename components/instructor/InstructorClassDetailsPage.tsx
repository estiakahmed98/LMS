"use client";

import { instructorFetch as fetch } from "@/lib/admin-swr";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Search,
  Timer,
  UserCheck,
  Users,
  UserX,
  Video,
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import type {
  AttendanceStatusValue,
  InstructorAttendanceRow,
  InstructorPagination,
  InstructorParticipantsPayload,
  InstructorSession,
} from "@/lib/instructor-types";
import { parseApiJson } from "@/lib/parse-api-json";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

const EMPTY_PAGINATION: InstructorPagination = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
};

function attendanceStatusClass(status: AttendanceStatusValue) {
  if (status === "PRESENT") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (status === "LATE") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }
  return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
}

function sessionStatusClass(status: InstructorSession["status"]) {
  if (status === "LIVE") return "border-red-500/20 bg-red-500/10 text-red-500";
  if (status === "COMPLETED") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (status === "UPCOMING") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
}

function downloadCsv(
  session: InstructorSession,
  rows: InstructorAttendanceRow[],
) {
  const csv = [
    ["Name", "Status", "Join Time", "Leave Time", "Duration (min)"],
    ...rows.map((row) => [
      row.userName,
      row.status,
      row.joinTime ? new Date(row.joinTime).toLocaleString() : "-",
      row.leaveTime ? new Date(row.leaveTime).toLocaleString() : "-",
      row.durationMinutes?.toString() ?? "-",
    ]),
  ]
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `attendance-${session.liveClass.title.replace(/\s+/g, "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function InstructorClassDetailsPage({
  sessionId,
}: {
  sessionId: string;
}) {
  const { can } = usePortalPermissions();
  const canExport = can("REPORTS", "export");
  const [session, setSession] = useState<InstructorSession | null>(null);
  const [attendance, setAttendance] = useState<InstructorAttendanceRow[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadDetails = useCallback(
    async ({ page = 1, student = "", silent = false } = {}) => {
      const sequence = ++requestSequence.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (student) params.set("student", student);
        const response = await fetch(
          `/api/instructor/classes/${sessionId}/participants?${params}`,
          { cache: "no-store" },
        );
        const data = await parseApiJson<
          InstructorParticipantsPayload & { error?: string }
        >(response);
        if (!response.ok)
          throw new Error(data.error ?? "Failed to load class details");
        if (sequence !== requestSequence.current) return;
        setSession(data.sessions.find((item) => item.id === sessionId) ?? null);
        setAttendance(data.attendance ?? []);
        setPagination(data.pagination ?? EMPTY_PAGINATION);
      } catch (loadError) {
        if (sequence === requestSequence.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load class details",
          );
        }
      } finally {
        if (sequence === requestSequence.current && !silent) setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  useEffect(() => {
    if (session?.status !== "LIVE") return;
    const interval = window.setInterval(() => {
      void loadDetails({
        page: pagination.page,
        student: appliedQuery,
        silent: true,
      });
    }, 6000);
    return () => window.clearInterval(interval);
  }, [appliedQuery, loadDetails, pagination.page, session?.status]);

  const metrics = useMemo(() => {
    const present =
      session?.presentCount ??
      attendance.filter((row) => row.status === "PRESENT").length;
    const late =
      session?.lateCount ??
      attendance.filter((row) => row.status === "LATE").length;
    const absent =
      session?.absentCount ??
      attendance.filter((row) => row.status === "ABSENT").length;
    const attended = present + late;
    const total = attended + absent;
    return {
      present,
      late,
      absent,
      attended,
      total,
      rate: total ? Math.round((attended / total) * 100) : 0,
    };
  }, [attendance, session]);

  const duration = useMemo(() => {
    if (!session) return 0;
    const start = new Date(
      session.actualStart ?? session.scheduledStart,
    ).getTime();
    const end = new Date(session.actualEnd ?? session.scheduledEnd).getTime();
    return Math.max(0, Math.round((end - start) / 60_000));
  }, [session]);

  if (loading && !session) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading class details...
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          href="/instructor/classes"
          className="text-sm font-semibold text-primary"
        >
          Back to classes
        </Link>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-6 p-2 md:p-4">
      <Link
        href="/instructor/classes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to classes
      </Link>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-5 md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold ${sessionStatusClass(session.status)}`}
                >
                  {session.status}
                </span>
                {session.status === "LIVE" && (
                  <span className="text-xs font-medium text-red-500">
                    Updates every 6 seconds
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">
                {session.liveClass.title}
              </h1>
              <p className="mt-1 text-muted-foreground">
                {session.liveClass.subjectName} ·{" "}
                {session.liveClass.courseTitle}
              </p>
            </div>
            {session.status === "LIVE" && (
              <Link
                href={`/live/${session.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
              >
                <Video className="h-4 w-4" /> Join live class
              </Link>
            )}
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              {new Date(session.scheduledStart).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />{" "}
              {session.liveClass.batchName}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Timer className="h-4 w-4 text-primary" /> {duration} minutes
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          {
            icon: UserCheck,
            label: "Attended",
            value: metrics.attended,
            tone: "text-emerald-500",
            background: "bg-emerald-500/10",
          },
          {
            icon: CheckCircle2,
            label: "Present",
            value: metrics.present,
            tone: "text-blue-500",
            background: "bg-blue-500/10",
          },
          {
            icon: Clock3,
            label: "Late",
            value: metrics.late,
            tone: "text-amber-500",
            background: "bg-amber-500/10",
          },
          {
            icon: UserX,
            label: "Absent",
            value: metrics.absent,
            tone: "text-red-500",
            background: "bg-red-500/10",
          },
          {
            icon: Users,
            label: "Attendance",
            value: `${metrics.rate}%`,
            tone: "text-primary",
            background: "bg-primary/10",
          },
        ].map(({ icon: Icon, label, value, tone, background }) => (
          <article
            key={label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <span className={`inline-flex rounded-lg p-2 ${background}`}>
              <Icon className={`h-4 w-4 ${tone}`} />
            </span>
            <p className="mt-3 text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Participants & attendance</h2>
            <p className="text-xs text-muted-foreground">
              Join time, leave time and attendance duration for this class.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form
              className="flex"
              onSubmit={(event) => {
                event.preventDefault();
                const student = query.trim();
                setAppliedQuery(student);
                void loadDetails({ student });
              }}
            >
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search student"
                className="min-w-0 rounded-l-lg border border-r-0 border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="rounded-r-lg bg-primary px-3 text-primary-foreground"
                aria-label="Search students"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
            {canExport && (
              <button
                type="button"
                onClick={() => downloadCsv(session, attendance)}
                disabled={attendance.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="border-b border-border px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Left</th>
                <th className="px-4 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendance.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                        {getInitials(row.userName)}
                      </span>
                      <span className="font-semibold">{row.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${attendanceStatusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.joinTime
                      ? new Date(row.joinTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.leaveTime
                      ? new Date(row.leaveTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.durationMinutes != null
                      ? `${row.durationMinutes} min`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendance.length === 0 && !loading && (
          <div className="px-4 py-14 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No participants found</p>
            <p className="text-xs text-muted-foreground">
              Attendance will appear here when learners join or are marked.
            </p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total,
              )}{" "}
              of {pagination.total} participants
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || pagination.page <= 1}
                onClick={() =>
                  void loadDetails({
                    page: pagination.page - 1,
                    student: appliedQuery,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="min-w-20 text-center text-xs font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={loading || pagination.page >= pagination.totalPages}
                onClick={() =>
                  void loadDetails({
                    page: pagination.page + 1,
                    student: appliedQuery,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
