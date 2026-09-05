"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, FileText, LoaderCircle, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { ASSESSMENT_TYPES, ASSESSMENT_STATUSES, type AssessmentListFilters, type AssessmentListResponse } from "@/lib/assessment-list";

const typeLabels = { MCQ: "MCQ", WRITTEN: "Written", PRACTICAL: "Practical", MIXED: "Mixed" };
const statusLabels = { ALL: "All", AVAILABLE: "Available", UPCOMING: "Upcoming", PENDING: "Pending review", COMPLETED: "Completed", CLOSED: "Closed" };
const statusColors = { ALL: "", AVAILABLE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", UPCOMING: "bg-blue-500/10 text-blue-700 dark:text-blue-300", PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-300", COMPLETED: "bg-primary/10 text-primary", CLOSED: "bg-muted text-muted-foreground" };
type TabState = Omit<AssessmentListFilters, "type" | "cursor"> & { cursors: string[] };
const initial = (): TabState => ({ status: "ALL", courseId: "", batchId: "", scope: "", from: "", to: "", pageSize: 12, cursors: [""] });
const inputClass = "mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40";
function dateTime(value: string) { return new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" }).format(new Date(value)); }

export default function AssessmentsPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<AssessmentListFilters["type"]>("MCQ");
  const [tabs, setTabs] = useState<Record<AssessmentListFilters["type"], TabState>>({ MCQ: initial(), WRITTEN: initial(), PRACTICAL: initial(), MIXED: initial() });
  const [data, setData] = useState<AssessmentListResponse | null>(null);
  const [options, setOptions] = useState<{ courses: { id: string; title: string }[]; batches: { id: string; name: string }[] }>({ courses: [], batches: [] });
  const [optionsError, setOptionsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const filters = tabs[activeTab];
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  function change(values: Partial<TabState>) { setTabs(previous => ({ ...previous, [activeTab]: { ...previous[activeTab], ...values, cursors: [""] } })); }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/learner/assessments?options=1", { signal: controller.signal, cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(value => { setOptions(value); setOptionsError(false); })
      .catch(() => { if (!controller.signal.aborted) setOptionsError(true); });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    if (invalidRange) return () => controller.abort();
    async function load() {
      setLoading(true); setError(null); setData(null);
      const { cursors, ...values } = filters;
      const params = new URLSearchParams({ ...values, pageSize: String(values.pageSize), type: activeTab, cursor: cursors[cursors.length - 1] });
      try {
        const response = await fetch(`/api/learner/assessments?${params}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load assessments.");
        if (!controller.signal.aborted) setData(result);
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Failed to load assessments."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [activeTab, filters, retry, invalidRange]);
  const filtered = Boolean(filters.courseId || filters.batchId || filters.scope || filters.from || filters.to);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><FileText className="h-6 w-6" /></span><div><h1 className="text-3xl font-bold tracking-tight">{t("assessmentsPage.title")}</h1><p className="mt-1 text-sm text-muted-foreground">Plan upcoming assessments, track submissions, and revisit your results.</p></div></div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex overflow-x-auto border-b border-border p-2" aria-label="Assessment types">
          {ASSESSMENT_TYPES.map(type => <button key={type} aria-pressed={activeTab === type} onClick={() => setActiveTab(type)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors ${activeTab === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{typeLabels[type]}{data && !loading && <span className="rounded-md bg-background/20 px-2 py-0.5 text-xs">{data.typeCounts[type] || 0}</span>}</button>)}
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" />{typeLabels[activeTab]} filters</p><button onClick={() => setTabs(previous => ({ ...previous, [activeTab]: initial() }))} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"><RotateCcw className="h-3.5 w-3.5" />Reset filters</button></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs font-medium">Course<select className={inputClass} value={filters.courseId} onChange={event => change({ courseId: event.target.value })}><option value="">All my courses</option>{options.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
            <label className="text-xs font-medium">Batch / group<select className={inputClass} value={filters.batchId} onChange={event => change({ batchId: event.target.value })}><option value="">All my batches / groups</option>{options.batches.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</select></label>
            <label className="text-xs font-medium">Assigned through<select className={inputClass} value={filters.scope} onChange={event => change({ scope: event.target.value })}><option value="">All assignments</option><option value="COURSE">Course</option><option value="BATCH">Batch / group</option><option value="LEARNER">Individual</option></select></label>
            <label className="text-xs font-medium">From date<input type="date" className={inputClass} value={filters.from} max={filters.to || undefined} onChange={event => change({ from: event.target.value })} /></label>
            <label className="text-xs font-medium">To date<input type="date" className={inputClass} value={filters.to} min={filters.from || undefined} onChange={event => change({ to: event.target.value })} /></label>
          </div>
          <p className="text-xs text-muted-foreground">Dates use the assessment opening date, or creation date when unscheduled (Bangladesh time). Filters are remembered separately for each type.</p>
          {optionsError && <p role="alert" className="text-sm text-destructive">Could not load filter options. <button className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
          {invalidRange && <p role="alert" className="text-sm text-destructive">From date must be on or before To date.</p>}
        </div>
      </section>
      <div className="flex flex-wrap gap-2" aria-label="Assessment status">
        {ASSESSMENT_STATUSES.map(status => <button key={status} aria-pressed={filters.status === status} onClick={() => change({ status })} className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${filters.status === status ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}>{statusLabels[status]}{data && !loading && <span className="ml-2 text-xs tabular-nums">{data.statusCounts[status] || 0}</span>}</button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p aria-live="polite" className="text-muted-foreground">{loading ? "Loading assessments…" : `${data?.total ?? 0} ${filtered ? "matching " : ""}assessments`}</p><label className="flex items-center gap-2 text-muted-foreground">Per page<select className="rounded-lg border border-border bg-background px-2 py-1.5" value={filters.pageSize} onChange={event => change({ pageSize: Number(event.target.value) })}>{[12, 24, 48].map(size => <option key={size}>{size}</option>)}</select></label></div>
      {error ? <div role="alert" className="rounded-xl border border-destructive/30 p-8 text-center"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-3 text-primary underline">Try again</button></div> : invalidRange ? null : loading ? <div className="flex min-h-64 items-center justify-center" role="status"><LoaderCircle className="h-7 w-7 animate-spin text-primary" /><span className="sr-only">Loading assessments</span></div> : data?.assessments.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.assessments.map(assessment => {
            const hasResult = Boolean(assessment.submissionId);
            const canOpen = hasResult || assessment.listStatus === "AVAILABLE";
            return <article key={assessment.id} className={`relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors ${canOpen ? "hover:border-primary/50 hover:bg-muted/20 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2" : ""}`}>
              <div className="mb-4 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-muted-foreground">{typeLabels[assessment.type]}</span><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[assessment.listStatus]}`}>{statusLabels[assessment.listStatus]}</span></div>
              <h2 className="break-words text-lg font-semibold">{assessment.title}</h2><p className="mt-1 text-sm text-muted-foreground">{assessment.courseTitle}</p>
              {assessment.batchName && <p className="mt-2 text-xs text-muted-foreground">Batch / group: {assessment.batchName}</p>}
              <div className="my-4 flex gap-4 border-y border-border py-3 text-sm"><span><strong>{assessment.totalMarks}</strong> marks</span><span><strong>{assessment.passingMarks}</strong> to pass</span></div>
              <div className="mb-5 space-y-2 text-xs text-muted-foreground"><p>Attempts: {assessment.attemptsUsed}{assessment.attemptLimit ? ` / ${assessment.attemptLimit}` : ""}</p>{assessment.availableFrom && <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" />Opens: {dateTime(assessment.availableFrom)}</p>}<p>{assessment.dueAt ? `Deadline: ${dateTime(assessment.dueAt)}` : "No deadline set"}</p>{assessment.listStatus === "COMPLETED" && <p className="font-semibold text-primary">Score: {assessment.obtainedMarks} / {assessment.totalMarks}</p>}</div>
              <div className="mt-auto border-t border-border pt-4">{canOpen ? <Link href={hasResult ? `/assessments/${assessment.id}/result` : `/assessments/${assessment.id}`} aria-label={`${assessment.title}: ${hasResult ? "view result" : "open assessment"}`} className="flex items-center justify-between text-sm font-semibold text-primary outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']">{hasResult ? assessment.listStatus === "PENDING" ? "View submission" : "View result & attempts" : "Start assessment"}<ArrowRight className="h-4 w-4" /></Link> : <p className="text-sm text-muted-foreground">{assessment.listStatus === "UPCOMING" ? "Available when the assessment opens" : "This assessment is closed"}</p>}</div>
            </article>;
          })}
        </div>
      ) : <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center"><FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-semibold">No assessments found</h2><p className="mt-2 text-sm text-muted-foreground">Try another status or adjust your filters.</p></div>}
      <nav aria-label="Assessment pagination" className="flex items-center justify-between border-t border-border pt-4"><button disabled={loading || invalidRange || filters.cursors.length === 1} onClick={() => setTabs(previous => ({ ...previous, [activeTab]: { ...previous[activeTab], cursors: previous[activeTab].cursors.slice(0, -1) } }))} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button><span className="text-sm text-muted-foreground">Page {filters.cursors.length}</span><button disabled={loading || invalidRange || !data?.nextCursor} onClick={() => { if (data?.nextCursor) setTabs(previous => ({ ...previous, [activeTab]: { ...previous[activeTab], cursors: [...previous[activeTab].cursors, data.nextCursor!] } })); }} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button></nav>
    </div>
  );
}
