"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import type {
  AssessmentAssignmentData,
  AssessmentAssignmentStatusValue,
  AssessmentAssignmentTargetValue,
} from "@/lib/assessment-assignment-types";
import {
  createAssessmentCohort,
  fetchAssessmentAssignments,
  removeAssessmentAssignment,
  saveAssessmentAssignment,
  setAssessmentAssignmentStatus,
  syncAssessmentCohortMembers,
} from "@/lib/assessment-assignment-client";

function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formatDate(value: string | null) {
  if (!value) return "No limit";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AssessmentAssignmentPanel({
  assessmentId,
  readOnly,
}: {
  assessmentId: string;
  readOnly: boolean;
}) {
  const [data, setData] = useState<AssessmentAssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [targetType, setTargetType] =
    useState<AssessmentAssignmentTargetValue>("COURSE");
  const [status, setStatus] =
    useState<AssessmentAssignmentStatusValue>("PUBLISHED");
  const [batchId, setBatchId] = useState("");
  const [learnerIds, setLearnerIds] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [attemptLimit, setAttemptLimit] = useState("1");
  const [learnerQuery, setLearnerQuery] = useState("");
  const [showCohortTools, setShowCohortTools] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchStart, setNewBatchStart] = useState("");
  const [newBatchEnd, setNewBatchEnd] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);

  async function load() {
    try {
      setLoading(true);
      setData(await fetchAssessmentAssignments(assessmentId));
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [assessmentId]);

  const filteredLearners = (data?.learners ?? []).filter((learner) => {
    const query = learnerQuery.trim().toLowerCase();
    return !query || learner.name.toLowerCase().includes(query) || learner.email.toLowerCase().includes(query);
  });

  function chooseBatch(nextBatchId: string) {
    setBatchId(nextBatchId);
    setMemberIds(
      data?.batches.find((batch) => batch.id === nextBatchId)?.memberIds ?? [],
    );
  }

  function toggleId(ids: string[], id: string, setter: (value: string[]) => void) {
    setter(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  async function run(operation: () => Promise<AssessmentAssignmentData>, success: string) {
    try {
      setBusy(true);
      const next = await operation();
      setData(next);
      setNotice(success);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Operation failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAssignment() {
    await run(
      () =>
        saveAssessmentAssignment(assessmentId, {
          targetType,
          batchId: targetType === "BATCH" ? batchId : undefined,
          learnerIds: targetType === "LEARNER" ? learnerIds : undefined,
          status,
          availableFrom: toIso(availableFrom),
          dueAt: toIso(dueAt),
          attemptLimit: Number(attemptLimit),
        }),
      "Assignment saved.",
    );
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading assignment controls…
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-[linear-gradient(120deg,hsl(var(--primary)/0.1),transparent)] px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Delivery &amp; access</p>
          <h2 className="mt-1 text-lg font-bold">Assessment assignments</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Explicitly control who receives this assessment and when they may attempt it.
          </p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg border border-border bg-background p-2 hover:bg-muted" aria-label="Refresh assignments">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Assignment targets</h3>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
              {data?.assignments.length ?? 0} assignment(s)
            </span>
          </div>
          {(data?.assignments ?? []).map((assignment) => (
            <article key={assignment.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{assignment.targetType}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${assignment.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : assignment.status === "CLOSED" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-700"}`}>{assignment.status}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold">{assignment.targetLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{assignment.recipientCount} recipient(s) · {assignment.attemptLimit} attempt(s)</p>
                </div>
                {!readOnly && (
                  <button type="button" disabled={busy} onClick={() => {
                    if (window.confirm(`Remove assignment for ${assignment.targetLabel}?`)) {
                      void run(() => removeAssessmentAssignment(assessmentId, assignment.id), "Assignment removed.");
                    }
                  }} className="rounded-lg border border-border p-2 text-destructive hover:bg-muted" aria-label="Remove assignment">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <span>Available: {formatDate(assignment.availableFrom)}</span>
                <span>Deadline: {formatDate(assignment.dueAt)}</span>
              </div>
              {!readOnly && (
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  {assignment.status !== "PUBLISHED" && <button type="button" disabled={busy} onClick={() => void run(() => setAssessmentAssignmentStatus(assessmentId, assignment.id, "PUBLISHED"), "Assignment published.")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Publish</button>}
                  {assignment.status === "PUBLISHED" && <button type="button" disabled={busy} onClick={() => void run(() => setAssessmentAssignmentStatus(assessmentId, assignment.id, "CLOSED"), "Assignment closed.")} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold">Close</button>}
                </div>
              )}
            </article>
          ))}
          {!data?.assignments.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No assignment exists. Learners cannot access this assessment yet.</p>}
        </div>

        {!readOnly && (
          <div className="space-y-4 rounded-xl border border-border bg-muted/25 p-4">
            <h3 className="text-sm font-bold">Create or update assignment</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold">Target
                <select value={targetType} onChange={(event) => setTargetType(event.target.value as AssessmentAssignmentTargetValue)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal">
                  <option value="COURSE">Entire course</option>
                  <option value="BATCH">Batch / cohort</option>
                  <option value="LEARNER">Selected learners</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">Initial status
                <select value={status} onChange={(event) => setStatus(event.target.value as AssessmentAssignmentStatusValue)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal">
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </label>
            </div>

            {targetType === "BATCH" && (
              <div className="space-y-3">
                <label className="grid gap-1.5 text-xs font-semibold">Batch / cohort
                  <select value={batchId} onChange={(event) => chooseBatch(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-normal">
                    <option value="">Select batch…</option>
                    {data?.batches.filter((batch) => batch.status === "ACTIVE").map((batch) => <option key={batch.id} value={batch.id}>{batch.name} ({batch.memberIds.length})</option>)}
                  </select>
                </label>
                <button type="button" onClick={() => setShowCohortTools((current) => !current)} className="flex items-center gap-2 text-xs font-bold text-primary">
                  <UsersRound className="h-4 w-4" /> Manage cohorts <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {targetType === "LEARNER" && (
              <LearnerPicker learners={filteredLearners} selectedIds={learnerIds} query={learnerQuery} onQuery={setLearnerQuery} onToggle={(id) => toggleId(learnerIds, id, setLearnerIds)} />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold"><span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Available from</span><input type="datetime-local" value={availableFrom} onChange={(event) => setAvailableFrom(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
              <label className="grid gap-1.5 text-xs font-semibold">Deadline<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold">Attempt limit<input type="number" min={1} max={10} value={attemptLimit} onChange={(event) => setAttemptLimit(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
            <button type="button" disabled={busy || (targetType === "BATCH" && !batchId) || (targetType === "LEARNER" && !learnerIds.length)} onClick={() => void handleSaveAssignment()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save assignment
            </button>
          </div>
        )}
      </div>

      {!readOnly && showCohortTools && (
        <div className="border-t border-border bg-background p-5">
          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="space-y-3">
              <h3 className="text-sm font-bold">Create cohort</h3>
              <input value={newBatchName} onChange={(event) => setNewBatchName(event.target.value)} placeholder={`${data?.assessment.courseTitle ?? "Course"} · Batch A`} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs font-semibold">Starts<input type="datetime-local" value={newBatchStart} onChange={(event) => setNewBatchStart(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
                <label className="grid gap-1 text-xs font-semibold">Ends<input type="datetime-local" value={newBatchEnd} onChange={(event) => setNewBatchEnd(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" /></label>
              </div>
              <button type="button" disabled={busy || !newBatchName.trim()} onClick={() => void (async () => {
                const created = await run(
                  () => createAssessmentCohort(assessmentId, {
                    name: newBatchName.trim(),
                    startDate: toIso(newBatchStart),
                    endDate: toIso(newBatchEnd),
                  }),
                  "Cohort created.",
                );
                if (created) {
                  setNewBatchName("");
                  setNewBatchStart("");
                  setNewBatchEnd("");
                }
              })()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"><Plus className="h-4 w-4" /> Create cohort</button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Cohort members</h3><span className="text-xs text-muted-foreground">{memberIds.length} selected</span></div>
              {!batchId ? <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">Select a batch above to manage its members.</p> : <>
                <LearnerPicker learners={filteredLearners} selectedIds={memberIds} query={learnerQuery} onQuery={setLearnerQuery} onToggle={(id) => toggleId(memberIds, id, setMemberIds)} />
                <button type="button" disabled={busy} onClick={() => void run(() => syncAssessmentCohortMembers(assessmentId, batchId, memberIds), "Cohort members saved.")} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"><UserRoundCheck className="h-4 w-4" /> Save members</button>
              </>}
            </div>
          </div>
        </div>
      )}

      {notice && <div className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3 text-xs font-medium"><span>{notice}</span><button type="button" onClick={() => setNotice("")}><X className="h-3.5 w-3.5" /></button></div>}
    </section>
  );
}

function LearnerPicker({ learners, selectedIds, query, onQuery, onToggle }: { learners: Array<{ id: string; name: string; email: string }>; selectedIds: string[]; query: string; onQuery: (value: string) => void; onToggle: (id: string) => void }) {
  return <div className="overflow-hidden rounded-lg border border-border bg-background"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search course learners…" className="w-full border-b border-border bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none" /></label><div className="max-h-48 divide-y divide-border overflow-y-auto">{learners.map((learner) => <label key={learner.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50"><input type="checkbox" checked={selectedIds.includes(learner.id)} onChange={() => onToggle(learner.id)} /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{learner.name}</span><span className="block truncate text-xs text-muted-foreground">{learner.email}</span></span></label>)}{!learners.length && <p className="p-4 text-center text-xs text-muted-foreground">No approved learner found.</p>}</div></div>;
}
