"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { useHasMounted } from "@/lib/use-has-mounted";
import { getInitials } from "@/lib/auth";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  GraduationCap,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import {
  getInstructors,
  getSessionsByLiveClassId,
  getUserById,
  mockLiveClasses,
  type LiveClassStatus,
  type SessionStatus,
} from "@/lib/mock-data";

function liveClassStatusClass(status: LiveClassStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-red-200 bg-red-50 text-red-700";
    case "SCHEDULED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "COMPLETED":
      return "border-green-200 bg-green-50 text-green-700";
    case "CANCELLED":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function sessionStatusClass(status: SessionStatus) {
  switch (status) {
    case "LIVE":
      return "border-red-200 bg-red-50 text-red-700";
    case "UPCOMING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "COMPLETED":
      return "border-green-200 bg-green-50 text-green-700";
    case "MISSED":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "CANCELLED":
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function InstructorDetailPage({
  instructorId,
}: {
  instructorId: string;
}) {
  const t = useTranslations("adminInstructorsPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const hasMounted = useHasMounted();

  const instructor = getUserById(instructorId);
  const instructors = getInstructors();

  // Local, in-memory class -> instructor assignment map so reassigning here
  // updates the view immediately without a backend. Seeded from the mock data.
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(mockLiveClasses.map((c) => [c.id, c.instructorId])),
  );
  const [notice, setNotice] = useState("Instructor detail loaded.");
  const [classToAssign, setClassToAssign] = useState("");

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  // Mock session dates are computed from Date.now() at module load, so
  // formatting them before the client mounts would mismatch the server render.
  function formatDateTime(date: Date) {
    return hasMounted ? dateTimeFormatter.format(date) : "";
  }

  const assignedClasses = useMemo(
    () =>
      mockLiveClasses.filter(
        (liveClass) => assignments[liveClass.id] === instructorId,
      ),
    [assignments, instructorId],
  );

  const otherClasses = useMemo(
    () =>
      mockLiveClasses.filter(
        (liveClass) => assignments[liveClass.id] !== instructorId,
      ),
    [assignments, instructorId],
  );

  const sessions = useMemo(
    () =>
      assignedClasses.flatMap((liveClass) =>
        getSessionsByLiveClassId(liveClass.id).map((session) => ({
          session,
          liveClass,
        })),
      ),
    [assignedClasses],
  );

  const stats = useMemo(() => {
    const all = sessions.map((row) => row.session);
    return {
      classes: assignedClasses.length,
      upcoming: all.filter((s) => s.status === "UPCOMING").length,
      completed: all.filter((s) => s.status === "COMPLETED").length,
      missed: all.filter((s) => s.status === "MISSED").length,
    };
  }, [assignedClasses, sessions]);

  if (!instructor) {
    return (
      <AdminLayout title={tAdmin("instructorManagement")}>
        <div className="space-y-6 p-6">
          <Link
            href="/admin/instructors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {label("detail.back", "Back to instructors")}
          </Link>
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {label("detail.notFound", "Instructor not found.")}
          </div>
        </div>
      </AdminLayout>
    );
  }

  function reassignClass(classId: string, nextInstructorId: string) {
    setAssignments((current) => ({ ...current, [classId]: nextInstructorId }));
    const target = getUserById(nextInstructorId);
    if (nextInstructorId === instructorId) {
      setNotice(
        label("notice.assigned", "Class assigned to {name}.", {
          name: instructor?.name ?? "",
        }),
      );
    } else {
      setNotice(
        label("notice.reassigned", "Class reassigned to {name}.", {
          name: target?.name ?? "",
        }),
      );
    }
  }

  function handleAssignExisting() {
    if (!classToAssign) {
      return;
    }
    reassignClass(classToAssign, instructorId);
    setClassToAssign("");
  }

  return (
    <AdminLayout title={instructor.name}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin/instructors"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {label("detail.back", "Back to instructors")}
            </Link>
            <div className="mt-4 flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {getInitials(instructor.name)}
              </span>
              <div>
                <h1 className="text-3xl font-bold text-card-foreground">
                  {instructor.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {instructor.email}
                  </span>
                  {instructor.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {instructor.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{notice}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              instructor.status === "ACTIVE"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {instructor.status}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t("stats.classes")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.classes)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t("stats.upcoming")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.upcoming)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t("stats.completed")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.completed)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("stats.missed", "Missed")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.missed)}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-card-foreground">
              {label("detail.assignedClasses", "Assigned Classes")}
            </h2>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4">
            <div className="min-w-60 flex-1">
              <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                {label("detail.assignClass", "Assign a class to this instructor")}
              </label>
              <select
                value={classToAssign}
                onChange={(event) => setClassToAssign(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              >
                <option value="">
                  {label("detail.selectClass", "Select a class…")}
                </option>
                {otherClasses.map((liveClass) => (
                  <option key={liveClass.id} value={liveClass.id}>
                    {liveClass.title} — {liveClass.batchName}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssignExisting}
              disabled={!classToAssign}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {label("detail.assign", "Assign")}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {assignedClasses.length > 0 ? (
              assignedClasses.map((liveClass) => (
                <div
                  key={liveClass.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {liveClass.subjectName}
                      </p>
                      <p className="mt-0.5 font-semibold text-card-foreground">
                        {liveClass.title}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {liveClass.batchName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${liveClassStatusClass(liveClass.status)}`}
                    >
                      {liveClass.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-60 flex-1">
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                        {label("detail.reassignTo", "Reassign to instructor")}
                      </label>
                      <select
                        value={assignments[liveClass.id] ?? instructorId}
                        onChange={(event) =>
                          reassignClass(liveClass.id, event.target.value)
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      >
                        {instructors.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Link
                      href={`/admin/classes/${liveClass.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                    >
                      {label("detail.viewClass", "View class")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {label(
                  "detail.noClasses",
                  "No classes are assigned to this instructor yet.",
                )}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-card-foreground">
              {label("detail.sessionsTitle", "Session Timeline")}
            </h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{label("detail.table.class", "Class")}</th>
                  <th className="px-4 py-3">{label("detail.table.batch", "Batch")}</th>
                  <th className="px-4 py-3">{label("detail.table.start", "Start")}</th>
                  <th className="px-4 py-3">{label("detail.table.status", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.length > 0 ? (
                  sessions.map(({ session, liveClass }) => (
                    <tr key={session.id}>
                      <td className="px-4 py-3 font-medium text-card-foreground">
                        {liveClass.title}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {liveClass.batchName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(session.scheduledStart)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${sessionStatusClass(session.status)}`}
                        >
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      {label(
                        "detail.noSessions",
                        "No sessions scheduled for this instructor yet.",
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
