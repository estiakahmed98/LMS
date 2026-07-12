"use client";

import AdminLayout from "@/components/AdminLayout";
import { fetchUser, updateUser } from "@/lib/admin-user-client";
import type {
  AdminUserDetail,
  SessionStatusValue,
  UserStatusValue,
} from "@/lib/admin-user-types";
import { getInitials } from "@/lib/auth";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Mail,
  Phone,
  Save,
  UserCog,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function badgeClass(status: string) {
  if (status === "COMPLETED" || status === "ACTIVE" || status === "APPROVED")
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "LIVE") return "border-red-200 bg-red-50 text-red-700";
  if (status === "UPCOMING" || status === "SCHEDULED")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "MISSED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function InstructorDetailPage({
  instructorId,
}: {
  instructorId: string;
}) {
  const [instructor, setInstructor] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("Loading instructor…");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    status: "ACTIVE" as UserStatusValue,
    password: "",
  });

  async function loadInstructor() {
    try {
      setLoading(true);
      const data = await fetchUser(instructorId);
      setInstructor(data);
      setDraft({
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        status: data.status,
        password: "",
      });
      setNotice("Instructor information is up to date.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Instructor not found.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInstructor();
  }, [instructorId]);

  const rows = useMemo(
    () =>
      instructor?.liveClasses
        .flatMap((liveClass) =>
          liveClass.sessions.map((session) => ({ liveClass, session })),
        )
        .sort((a, b) =>
          b.session.scheduledStart.localeCompare(a.session.scheduledStart),
        ) ?? [],
    [instructor],
  );
  const stats = useMemo(
    () => ({
      classes: instructor?.liveClasses.length ?? 0,
      total: rows.length,
      completed: rows.filter(({ session }) => session.status === "COMPLETED")
        .length,
      upcoming: rows.filter(
        ({ session }) =>
          session.status === "UPCOMING" || session.status === "LIVE",
      ).length,
    }),
    [instructor, rows],
  );
  const nextSessions = rows
    .filter(({ session }) => session.status === "UPCOMING")
    .sort((a, b) =>
      a.session.scheduledStart.localeCompare(b.session.scheduledStart),
    );

  async function saveProfile() {
    if (!instructor) return;
    try {
      setSaving(true);
      const data = await updateUser(instructor.id, {
        ...draft,
        role: "INSTRUCTOR",
        photoUrl: instructor.photoUrl,
        ...(draft.password ? { password: draft.password } : {}),
      });
      setInstructor(data);
      setDraft((current) => ({ ...current, password: "" }));
      setEditing(false);
      setNotice("Instructor profile updated successfully.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <AdminLayout title="Instructor details">
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  if (!instructor)
    return (
      <AdminLayout title="Instructor details">
        <main className="p-6">
          <Link
            href="/admin/instructors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to instructors
          </Link>
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            {notice}
          </div>
        </main>
      </AdminLayout>
    );

  return (
    <AdminLayout title={instructor.name}>
      <main className="space-y-6 p-4 sm:p-6">
        <Link
          href="/admin/instructors"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to instructors
        </Link>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="h-24 bg-linear-to-r from-primary/25 via-primary/10 to-transparent" />
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
            <div className="-mt-10 flex items-end gap-4">
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-primary text-2xl font-bold text-primary-foreground shadow">
                {instructor.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={instructor.photoUrl}
                    alt={instructor.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(instructor.name)
                )}
              </span>
              <div className="pb-1">
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {instructor.name}
                </h1>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {instructor.email}
                  </span>
                  {instructor.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {instructor.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${badgeClass(instructor.status)}`}
              >
                {instructor.status}
              </span>
              <button
                onClick={() => setEditing((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                <UserCog className="h-4 w-4" /> Edit profile
              </button>
            </div>
          </div>
        </section>

        <p className="text-sm text-muted-foreground" role="status">
          {notice}
        </p>

        {editing && (
          <section className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Manage instructor account</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <label className="text-sm">
                Name
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                Email
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                Phone
                <input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                Status
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      status: e.target.value as UserStatusValue,
                    })
                  }
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </label>
              <label className="text-sm">
                New password
                <input
                  type="password"
                  minLength={8}
                  placeholder="Keep unchanged"
                  value={draft.password}
                  onChange={(e) =>
                    setDraft({ ...draft, password: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={saving}
                onClick={() => void saveProfile()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}{" "}
                Save changes
              </button>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [BookOpen, stats.classes, "Assigned classes"],
            [Video, stats.total, "Total sessions"],
            [CheckCircle2, stats.completed, "Classes taken"],
            [CalendarClock, stats.upcoming, "Live & upcoming"],
          ].map(([Icon, value, label]) => {
            const StatIcon = Icon as typeof BookOpen;
            return (
              <article
                key={String(label)}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {String(label)}
                  </span>
                  <span className="rounded-xl bg-primary/10 p-2 text-primary">
                    <StatIcon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold">{String(value)}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Next scheduled classes</h2>
              <p className="text-sm text-muted-foreground">
                The instructor’s upcoming teaching calendar.
              </p>
            </div>
            <CalendarClock className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {nextSessions.length ? (
              nextSessions.map(({ liveClass, session }) => (
                <article
                  key={session.id}
                  className="flex items-center gap-4 rounded-xl border border-border p-4"
                >
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{liveClass.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {liveClass.courseTitle} · {liveClass.batchName}
                    </p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {formatDate(session.scheduledStart)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/classes/${liveClass.id}`}
                    aria-label={`Manage ${liveClass.title}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </article>
              ))
            ) : (
              <p className="col-span-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No upcoming class scheduled.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-bold">Assigned classes</h2>
              <p className="text-sm text-muted-foreground">
                Open a class to manage schedule, sessions, attendance and
                recordings.
              </p>
            </div>
            <Link
              href="/admin/classes"
              className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Manage all classes
            </Link>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            {instructor.liveClasses.length ? (
              instructor.liveClasses.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.subjectName}
                      </p>
                      <h3 className="mt-1 font-bold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.courseTitle} · {item.batchName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-bold ${badgeClass(item.status)}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>
                      {item.sessions.length} sessions · {item.durationMinutes}{" "}
                      min
                    </span>
                    <Link
                      href={`/admin/classes/${item.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-primary"
                    >
                      Manage <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))
            ) : (
              <p className="col-span-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No class is assigned yet. Create or assign one from Class
                Management.
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-bold">Complete session timeline</h2>
            <p className="text-sm text-muted-foreground">
              When classes were taken, missed, cancelled or scheduled.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Course / batch</th>
                  <th className="px-5 py-3">Scheduled</th>
                  <th className="px-5 py-3">Actual</th>
                  <th className="px-5 py-3">Attendance</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length ? (
                  rows.map(({ liveClass, session }) => (
                    <tr key={session.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4 font-medium">
                        <Link
                          href={`/admin/classes/${liveClass.id}`}
                          className="hover:text-primary"
                        >
                          {liveClass.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {liveClass.courseTitle}
                        <br />
                        <span className="text-xs">{liveClass.batchName}</span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {formatDate(session.scheduledStart)}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {session.actualStart
                          ? formatDate(session.actualStart)
                          : "—"}
                      </td>
                      <td className="px-5 py-4">{session.attendanceCount}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(session.status as SessionStatusValue)}`}
                        >
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-muted-foreground"
                    >
                      No session records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </AdminLayout>
  );
}
