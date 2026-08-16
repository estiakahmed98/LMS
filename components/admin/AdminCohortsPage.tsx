"use client";

import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { createCohort, fetchCohorts } from "@/lib/admin-cohort-client";
import type { AdminCohortPayload, AdminCohortSummary } from "@/lib/admin-cohort-types";
import { normalizeCohortCode } from "@/lib/cohort-code";
import {
  ArrowRight,
  BookCopy,
  CalendarDays,
  Layers3,
  LoaderCircle,
  Plus,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

const emptyDraft: AdminCohortPayload = {
  code: "",
  name: "",
  description: null,
  status: "DRAFT",
  startDate: null,
  endDate: null,
  capacity: null,
  timezone: "Asia/Dhaka",
};

function statusClass(status: AdminCohortSummary["status"]) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "COMPLETED") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "ARCHIVED") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value))
    : "Open date";
}

export default function AdminCohortsPage() {
  const { can } = useAdminPermissions();
  const [cohorts, setCohorts] = useState<AdminCohortSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [codeEdited, setCodeEdited] = useState(false);
  const [draft, setDraft] = useState<AdminCohortPayload>(emptyDraft);
  const [notice, setNotice] = useState("Loading cohorts...");

  async function load() {
    try {
      setLoading(true);
      const rows = await fetchCohorts();
      setCohorts(rows);
      setNotice(rows.length ? `${rows.length} cohorts loaded.` : "No cohorts created yet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load cohorts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtered = cohorts.filter(
    (cohort) =>
      !normalizedQuery ||
      cohort.name.toLowerCase().includes(normalizedQuery) ||
      cohort.code.toLowerCase().includes(normalizedQuery),
  );
  const activeCount = cohorts.filter((item) => item.status === "ACTIVE").length;
  const learnerCount = cohorts.reduce((total, item) => total + item.memberCount, 0);
  const courseCount = cohorts.reduce((total, item) => total + item.courseCount, 0);

  function openEditor() {
    setDraft(emptyDraft);
    setCodeEdited(false);
    setEditorOpen(true);
  }

  async function handleCreate() {
    try {
      setSaving(true);
      const cohort = await createCohort(draft);
      setCohorts((current) => [cohort, ...current]);
      setEditorOpen(false);
      setNotice(`${cohort.name} created. Add courses and learners before activation.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create cohort.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Cohort Management">
      <main className="space-y-6 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-slate-950 text-white shadow-xl">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-64 -skew-x-12 bg-emerald-400/10" />
          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
                Delivery operations
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                Assign many courses to many learners in one controlled workflow.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Cohorts keep course access, learner intake and assessment targeting aligned without repetitive enrollment work.
              </p>
            </div>
            {can("COURSES", "create") && (
              <button
                onClick={openEditor}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                <Plus className="h-4 w-4" /> Create cohort
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          {[
            [Layers3, activeCount, "Active cohorts"],
            [UsersRound, learnerCount, "Active memberships"],
            [BookCopy, courseCount, "Course mappings"],
          ].map(([Icon, value, label]) => {
            const MetricIcon = Icon as typeof Layers3;
            return (
              <article key={String(label)} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{String(label)}</p>
                  <MetricIcon className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 text-3xl font-black">{String(value)}</p>
              </article>
            );
          })}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cohort name or code"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          <p className="text-sm text-muted-foreground" role="status">{notice}</p>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-card">
            <LoaderCircle className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : filtered.length ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((cohort) => (
              <Link
                key={cohort.id}
                href={`/admin/cohorts/${cohort.id}`}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-lg"
              >
                <div className="h-1.5 bg-linear-to-r from-cyan-500 via-emerald-400 to-transparent" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">{cohort.code}</p>
                      <h2 className="mt-1 truncate text-lg font-bold">{cohort.name}</h2>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(cohort.status)}`}>
                      {cohort.status}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                    {cohort.description || "No cohort description added."}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    {[
                      [cohort.courseCount, "Courses"],
                      [cohort.memberCount, "Learners"],
                      [cohort.enrollmentCount, "Access grants"],
                    ].map(([value, label]) => (
                      <div key={String(label)} className="rounded-xl bg-muted/60 px-2 py-3">
                        <p className="text-lg font-black">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> {dateLabel(cohort.startDate)} - {dateLabel(cohort.endDate)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-14 text-center text-sm text-muted-foreground">
            No matching cohort found.
          </div>
        )}

        {editorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4" role="dialog" aria-modal="true" aria-labelledby="cohort-editor-title">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">New intake</p>
                  <h2 id="cohort-editor-title" className="mt-1 text-2xl font-black">Create cohort</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Create as draft, configure courses and learners, then activate.</p>
                </div>
                <button aria-label="Close" onClick={() => setEditorOpen(false)} className="rounded-xl p-2 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                  Cohort name
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        name,
                        code: codeEdited ? current.code : normalizeCohortCode(name),
                      }));
                    }}
                    placeholder="Professional Diploma Intake 2026"
                    className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Unique code
                  <input
                    value={draft.code}
                    onChange={(event) => {
                      setCodeEdited(true);
                      setDraft((current) => ({ ...current, code: normalizeCohortCode(event.target.value) }));
                    }}
                    placeholder="PSTC-2026-B01"
                    className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono font-normal uppercase outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Capacity
                  <input
                    type="number"
                    min={1}
                    value={draft.capacity ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, capacity: event.target.value ? Number(event.target.value) : null }))}
                    placeholder="Unlimited"
                    className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Start date
                  <input type="date" value={draft.startDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value || null }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  End date
                  <input type="date" value={draft.endDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value || null }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal" />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                  Description
                  <textarea value={draft.description ?? ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value || null }))} rows={3} placeholder="Purpose, intake rules or delivery notes" className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 font-normal outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setEditorOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted">Cancel</button>
                <button disabled={saving || !draft.name || !draft.code} onClick={() => void handleCreate()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Create draft
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
