"use client";

import AdminLayout from "@/components/AdminLayout";
import { createUser, fetchUser, fetchUsers } from "@/lib/admin-user-client";
import type { AdminUserDetail } from "@/lib/admin-user-types";
import { getInitials } from "@/lib/auth";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  Plus,
  Search,
  UserRoundPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const emptyDraft = { name: "", email: "", phone: "", password: "" };

function statusClass(status: string) {
  return status === "ACTIVE" || status === "APPROVED"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export default function InstructorManagementPage() {
  const [instructors, setInstructors] = useState<AdminUserDetail[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState("Loading instructors…");
  const [draft, setDraft] = useState(emptyDraft);

  async function loadInstructors() {
    try {
      setLoading(true);
      const summaries = await fetchUsers("INSTRUCTOR");
      const details = await Promise.all(
        summaries.map((item) => fetchUser(item.id)),
      );
      setInstructors(details);
      setNotice(
        details.length
          ? `${details.length} instructors loaded.`
          : "No instructors yet.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to load instructors.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInstructors();
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return instructors.filter(
      (item) =>
        !value ||
        item.name.toLowerCase().includes(value) ||
        item.email.toLowerCase().includes(value),
    );
  }, [instructors, query]);

  async function handleCreate() {
    if (
      !draft.name.trim() ||
      !draft.email.trim() ||
      draft.password.length < 8
    ) {
      setNotice("Name, valid email and an 8+ character password are required.");
      return;
    }
    try {
      setSaving(true);
      await createUser({ ...draft, role: "INSTRUCTOR" });
      setDraft(emptyDraft);
      setEditorOpen(false);
      await loadInstructors();
      setNotice("Instructor created successfully.");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not create instructor.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Instructor Management">
      <main className="space-y-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="bg-linear-to-r from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Academic team
                </p>
                <h1 className="mt-1 text-2xl font-bold text-card-foreground sm:text-3xl">
                  Instructor management
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Create instructors and review every assigned class, completed
                  session and upcoming schedule.
                </p>
              </div>
              <button
                onClick={() => setEditorOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                <UserRoundPlus className="h-4 w-4" /> Add instructor
              </button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <p className="text-sm text-muted-foreground" role="status">
            {notice}
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : filtered.length ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((instructor) => {
              const sessions = instructor.liveClasses.flatMap(
                (item) => item.sessions,
              );
              const upcoming = sessions.filter(
                (item) => item.status === "UPCOMING" || item.status === "LIVE",
              ).length;
              const completed = sessions.filter(
                (item) => item.status === "COMPLETED",
              ).length;
              const next = sessions
                .filter((item) => item.status === "UPCOMING")
                .sort((a, b) =>
                  a.scheduledStart.localeCompare(b.scheduledStart),
                )[0];
              return (
                <Link
                  key={instructor.id}
                  href={`/admin/instructors/${instructor.id}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="h-1.5 bg-linear-to-r from-primary to-primary/30" />
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                        {getInitials(instructor.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate font-semibold text-card-foreground">
                          {instructor.name}
                        </h2>
                        <p className="truncate text-xs text-muted-foreground">
                          {instructor.email}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusClass(instructor.status)}`}
                      >
                        {instructor.status}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        [BookOpen, instructor.liveClasses.length, "Classes"],
                        [CalendarClock, upcoming, "Upcoming"],
                        [CheckCircle2, completed, "Completed"],
                      ].map(([Icon, count, label]) => {
                        const MetricIcon = Icon as typeof BookOpen;
                        return (
                          <div
                            key={String(label)}
                            className="rounded-xl bg-muted/50 p-2.5 text-center"
                          >
                            <MetricIcon className="mx-auto h-4 w-4 text-primary" />
                            <p className="mt-1 text-lg font-bold">
                              {String(count)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {String(label)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                      <span className="truncate text-muted-foreground">
                        {next
                          ? `Next: ${new Date(next.scheduledStart).toLocaleString()}`
                          : "No upcoming session"}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-primary transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            No matching instructor found.
          </div>
        )}

        {editorOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-instructor-title"
          >
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id="new-instructor-title" className="text-xl font-bold">
                    Add new instructor
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Create a secure instructor account.
                  </p>
                </div>
                <button
                  aria-label="Close"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-lg p-2 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium sm:col-span-2">
                  Full name
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium sm:col-span-2">
                  Email
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(e) =>
                      setDraft({ ...draft, email: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium">
                  Phone
                  <input
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft({ ...draft, phone: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5"
                  />
                </label>
                <label className="text-sm font-medium">
                  Temporary password
                  <input
                    type="password"
                    minLength={8}
                    value={draft.password}
                    onChange={(e) =>
                      setDraft({ ...draft, password: e.target.value })
                    }
                    className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5"
                  />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={() => void handleCreate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}{" "}
                  Create instructor
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
