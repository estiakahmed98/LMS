"use client";

import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import {
  fetchCohort,
  syncCohortCourses,
  syncCohortInstructors,
  syncCohortMembers,
  updateCohort,
} from "@/lib/admin-cohort-client";
import type {
  AdminCohortPayload,
  AdminCohortInstructorInput,
  AdminCohortStatus,
  AdminCohortWorkspace,
} from "@/lib/admin-cohort-types";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  CircleAlert,
  Layers3,
  LoaderCircle,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

type PickerItem = { id: string; title: string; subtitle: string; badge?: string };

function dateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDraft(workspace: AdminCohortWorkspace): AdminCohortPayload {
  const cohort = workspace.cohort;
  return {
    code: cohort.code,
    name: cohort.name,
    description: cohort.description,
    status: cohort.status,
    startDate: dateInput(cohort.startDate) || null,
    endDate: dateInput(cohort.endDate) || null,
    capacity: cohort.capacity,
    timezone: cohort.timezone,
  };
}

function Picker({
  items,
  selectedIds,
  disabled,
  emptyLabel,
  onChange,
}: {
  items: PickerItem[];
  selectedIds: string[];
  disabled: boolean;
  emptyLabel: string;
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedIds);
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="max-h-96 min-w-0 space-y-2 overflow-y-auto pr-1">
      {items.map((item) => {
        const checked = selected.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(checked ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id])}
            className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              checked
                ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-400/10"
                : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked ? "border-cyan-600 bg-cyan-600 text-white" : "border-border"}`}>
              {checked && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">{item.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
            </span>
            {item.badge && <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminCohortDetailPage({ cohortId }: { cohortId: string }) {
  const { can } = useAdminPermissions();
  const [workspace, setWorkspace] = useState<AdminCohortWorkspace | null>(null);
  const [draft, setDraft] = useState<AdminCohortPayload | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [instructorAssignments, setInstructorAssignments] = useState<AdminCohortInstructorInput[]>([]);
  const [assignmentDraft, setAssignmentDraft] = useState<AdminCohortInstructorInput>({
    batchCourseId: "",
    instructorId: "",
    role: "LEAD",
  });
  const [courseQuery, setCourseQuery] = useState("");
  const [learnerQuery, setLearnerQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"profile" | "courses" | "members" | "instructors" | null>(null);
  const [notice, setNotice] = useState("Loading cohort workspace...");
  const deferredCourseQuery = useDeferredValue(courseQuery);
  const deferredLearnerQuery = useDeferredValue(learnerQuery);

  function applyWorkspace(next: AdminCohortWorkspace) {
    setWorkspace(next);
    setDraft(toDraft(next));
    setSelectedCourseIds(next.cohort.courses.map((item) => item.id));
    setSelectedUserIds(
      next.cohort.members
        .filter((item) => item.membershipStatus === "ACTIVE")
        .map((item) => item.id),
    );
    setInstructorAssignments(
      next.cohort.courses.flatMap((course) =>
        course.instructors.map((item) => ({
          batchCourseId: item.batchCourseId,
          instructorId: item.instructorId,
          role: item.role,
        })),
      ),
    );
    setAssignmentDraft({
      batchCourseId: next.cohort.courses[0]?.mappingId ?? "",
      instructorId: next.catalog.instructors[0]?.id ?? "",
      role: "LEAD",
    });
  }

  async function load() {
    try {
      setLoading(true);
      applyWorkspace(await fetchCohort(cohortId));
      setNotice("Cohort workspace loaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load cohort.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [cohortId]);

  if (loading) {
    return (
      <AdminLayout title="Cohort Management">
        <div className="flex min-h-[70vh] items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" /> Loading cohort workspace...
        </div>
      </AdminLayout>
    );
  }

  if (!workspace || !draft) {
    return (
      <AdminLayout title="Cohort Management">
        <div className="m-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive">{notice}</div>
      </AdminLayout>
    );
  }

  const cohort = workspace.cohort;
  const editable = can("COURSES", "edit") && cohort.status !== "ARCHIVED";
  const normalizedCourseQuery = deferredCourseQuery.trim().toLowerCase();
  const normalizedLearnerQuery = deferredLearnerQuery.trim().toLowerCase();
  const filteredCourses = workspace.catalog.courses.filter(
    (item) => !normalizedCourseQuery || item.title.toLowerCase().includes(normalizedCourseQuery),
  );
  const filteredLearners = workspace.catalog.learners.filter(
    (item) =>
      !normalizedLearnerQuery ||
      item.name.toLowerCase().includes(normalizedLearnerQuery) ||
      item.email.toLowerCase().includes(normalizedLearnerQuery),
  );
  const courseItems = filteredCourses.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.level,
    badge: item.status,
  }));
  const learnerItems = filteredLearners.map((item) => ({
    id: item.id,
    title: item.name,
    subtitle: item.email,
    badge: item.status,
  }));
  const projectedEnrollments = selectedCourseIds.length * selectedUserIds.length;
  const capacityRemaining = draft.capacity === null ? null : draft.capacity - selectedUserIds.length;

  function selectVisible(current: string[], visible: PickerItem[]) {
    return [...new Set([...current, ...visible.map((item) => item.id)])];
  }

  function clearVisible(current: string[], visible: PickerItem[]) {
    const visibleIds = new Set(visible.map((item) => item.id));
    return current.filter((id) => !visibleIds.has(id));
  }

  async function saveProfile(nextStatus?: AdminCohortStatus) {
    if (!draft || !workspace) return;
    const payload = nextStatus ? { ...draft, status: nextStatus } : draft;
    if (
      cohort.status === "ACTIVE" &&
      payload.status !== "ACTIVE" &&
      !window.confirm(
        "Leaving ACTIVE status withdraws cohort-only course access. Learner progress will be preserved. Continue?",
      )
    ) {
      return;
    }
    try {
      setSaving("profile");
      const updated = await updateCohort(cohortId, payload);
      const next: AdminCohortWorkspace = { ...workspace, cohort: updated };
      applyWorkspace(next);
      setNotice(
        nextStatus === "ACTIVE"
          ? `Cohort activated. ${updated.enrollmentCount} course access grants are active.`
          : "Cohort details saved.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save cohort.");
    } finally {
      setSaving(null);
    }
  }

  async function saveCourses() {
    try {
      setSaving("courses");
      const next = await syncCohortCourses(cohortId, selectedCourseIds);
      applyWorkspace(next);
      setNotice(`${next.cohort.courseCount} courses mapped. ${next.cohort.enrollmentCount} access grants are active.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save course mappings.");
    } finally {
      setSaving(null);
    }
  }

  async function saveMembers() {
    try {
      setSaving("members");
      const next = await syncCohortMembers(cohortId, selectedUserIds);
      applyWorkspace(next);
      setNotice(`${next.cohort.memberCount} learners saved. ${next.cohort.enrollmentCount} access grants are active.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save cohort learners.");
    } finally {
      setSaving(null);
    }
  }

  function addInstructorAssignment() {
    if (!assignmentDraft.batchCourseId || !assignmentDraft.instructorId) {
      setNotice("Select a mapped course and an instructor first.");
      return;
    }
    const key = `${assignmentDraft.batchCourseId}:${assignmentDraft.instructorId}:${assignmentDraft.role}`;
    if (instructorAssignments.some((item) => `${item.batchCourseId}:${item.instructorId}:${item.role}` === key)) {
      setNotice("That instructor role is already in the mapping list.");
      return;
    }
    setInstructorAssignments((current) => [
      ...current.filter(
        (item) => !(assignmentDraft.role === "LEAD" && item.batchCourseId === assignmentDraft.batchCourseId && item.role === "LEAD"),
      ),
      assignmentDraft,
    ]);
    setNotice("Instructor mapping added to the draft. Save mappings to apply it.");
  }

  async function saveInstructors() {
    try {
      setSaving("instructors");
      const next = await syncCohortInstructors(cohortId, instructorAssignments);
      applyWorkspace(next);
      const total = next.cohort.courses.reduce((sum, course) => sum + course.instructors.length, 0);
      setNotice(`${total} instructor role mappings saved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save instructor mappings.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminLayout title={cohort.name}>
      <main className="min-w-0 space-y-6 overflow-x-hidden p-4 sm:p-6">
        <Link href="/admin/cohorts" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All cohorts
        </Link>

        <section className="overflow-hidden rounded-3xl border border-border bg-slate-950 text-white shadow-xl">
          <div className="grid gap-6 p-4 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-cyan-300 px-3 py-1 font-mono text-xs font-black text-slate-950">{cohort.code}</span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold">{cohort.status}</span>
              </div>
              <h1 className="mt-4 wrap-break-word text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">{cohort.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">{cohort.description || "Configure this cohort's delivery scope and learner intake."}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [cohort.courseCount, "Courses"],
                [cohort.memberCount, "Learners"],
                [cohort.enrollmentCount, "Grants"],
              ].map(([value, label]) => (
                <div key={String(label)} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-2.5 sm:p-3">
                  <p className="text-xl font-black text-cyan-300 sm:text-2xl">{value}</p>
                  <p className="text-[9px] uppercase tracking-wide text-slate-400 sm:text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground" role="status">
          {notice}
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Lifecycle</p>
              <h2 className="mt-1 text-xl font-black">Cohort profile</h2>
              <p className="text-sm text-muted-foreground">Draft cohorts do not grant course access until activated.</p>
            </div>
            {cohort.status === "DRAFT" && editable && (
              <button disabled={saving !== null || !cohort.courseCount || !cohort.memberCount} onClick={() => void saveProfile("ACTIVE")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" /> Activate cohort
              </button>
            )}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1.5 text-sm font-semibold md:col-span-2">
              Name
              <input disabled={!editable} value={draft.name} onChange={(event) => setDraft((current) => current && ({ ...current, name: event.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Code
              <input disabled={!editable} value={draft.code} onChange={(event) => setDraft((current) => current && ({ ...current, code: event.target.value.toUpperCase() }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-mono font-normal disabled:opacity-60" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Status
              <select disabled={!editable} value={draft.status} onChange={(event) => setDraft((current) => current && ({ ...current, status: event.target.value as AdminCohortStatus }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60">
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Start date
              <input disabled={!editable} type="date" value={draft.startDate ?? ""} onChange={(event) => setDraft((current) => current && ({ ...current, startDate: event.target.value || null }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              End date
              <input disabled={!editable} type="date" value={draft.endDate ?? ""} onChange={(event) => setDraft((current) => current && ({ ...current, endDate: event.target.value || null }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Capacity
              <input disabled={!editable} type="number" min={1} value={draft.capacity ?? ""} onChange={(event) => setDraft((current) => current && ({ ...current, capacity: event.target.value ? Number(event.target.value) : null }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Timezone
              <input disabled={!editable} value={draft.timezone} onChange={(event) => setDraft((current) => current && ({ ...current, timezone: event.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold md:col-span-2 xl:col-span-4">
              Description
              <textarea disabled={!editable} value={draft.description ?? ""} onChange={(event) => setDraft((current) => current && ({ ...current, description: event.target.value || null }))} rows={2} className="resize-none rounded-xl border border-border bg-background px-3 py-2.5 font-normal disabled:opacity-60" />
            </label>
          </div>
          {editable && (
            <div className="mt-5 flex justify-end">
              <button disabled={saving !== null} onClick={() => void saveProfile()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {saving === "profile" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-600">Curriculum scope</p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-black"><BookOpenCheck className="h-5 w-5" /> Courses</h2>
                <p className="text-sm text-muted-foreground">{selectedCourseIds.length} selected for every active member.</p>
              </div>
              <span className="shrink-0 rounded-xl bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-700">{selectedCourseIds.length}</span>
            </div>
            <label className="relative mt-5 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={courseQuery} onChange={(event) => setCourseQuery(event.target.value)} placeholder="Search 30+ courses" className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm" />
            </label>
            <div className="my-3 flex gap-2">
              <button disabled={!editable} onClick={() => setSelectedCourseIds((current) => selectVisible(current, courseItems))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">Select filtered</button>
              <button disabled={!editable} onClick={() => setSelectedCourseIds((current) => clearVisible(current, courseItems))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">Clear filtered</button>
            </div>
            <Picker items={courseItems} selectedIds={selectedCourseIds} disabled={!editable} emptyLabel="No course matches this search." onChange={setSelectedCourseIds} />
            {editable && (
              <button disabled={saving !== null} onClick={() => void saveCourses()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                {saving === "courses" && <LoaderCircle className="h-4 w-4 animate-spin" />} Save course mapping
              </button>
            )}
          </article>

          <article className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Learner intake</p>
                <h2 className="mt-1 flex items-center gap-2 text-xl font-black"><UsersRound className="h-5 w-5" /> Members</h2>
                <p className="text-sm text-muted-foreground">{selectedUserIds.length} learners receive all mapped courses.</p>
              </div>
              <span className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{selectedUserIds.length}</span>
            </div>
            <label className="relative mt-5 block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={learnerQuery} onChange={(event) => setLearnerQuery(event.target.value)} placeholder="Search learner name or email" className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm" />
            </label>
            <div className="my-3 flex gap-2">
              <button disabled={!editable} onClick={() => setSelectedUserIds((current) => selectVisible(current, learnerItems))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">Select filtered</button>
              <button disabled={!editable} onClick={() => setSelectedUserIds((current) => clearVisible(current, learnerItems))} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50">Clear filtered</button>
            </div>
            <Picker items={learnerItems} selectedIds={selectedUserIds} disabled={!editable} emptyLabel="No learner matches this search." onChange={setSelectedUserIds} />
            {capacityRemaining !== null && capacityRemaining < 0 && (
              <p className="mt-3 flex items-center gap-2 text-xs font-bold text-destructive"><CircleAlert className="h-4 w-4" /> Selection exceeds capacity by {Math.abs(capacityRemaining)}.</p>
            )}
            {editable && (
              <button disabled={saving !== null || (capacityRemaining !== null && capacityRemaining < 0)} onClick={() => void saveMembers()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                {saving === "members" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />} Save cohort members
              </button>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Delivery team</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black"><UserCog className="h-5 w-5" /> Instructor mapping</h2>
              <p className="text-sm text-muted-foreground">Lead and assistant instructors can host live classes. Maker and checker roles define the grading team.</p>
            </div>
            <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-black text-amber-800">{instructorAssignments.length} roles</span>
          </div>

          {!cohort.courses.length ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Save at least one course mapping before assigning instructors.</p>
          ) : !workspace.catalog.instructors.length ? (
            <p className="mt-5 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No active instructor account is available.</p>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_auto]">
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Cohort course
                  <select disabled={!editable} value={assignmentDraft.batchCourseId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, batchCourseId: event.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-foreground disabled:opacity-60">
                    {cohort.courses.map((course) => <option key={course.mappingId} value={course.mappingId}>{course.title}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Instructor
                  <select disabled={!editable} value={assignmentDraft.instructorId} onChange={(event) => setAssignmentDraft((current) => ({ ...current, instructorId: event.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-foreground disabled:opacity-60">
                    {workspace.catalog.instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name} · {instructor.email}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Role
                  <select disabled={!editable} value={assignmentDraft.role} onChange={(event) => setAssignmentDraft((current) => ({ ...current, role: event.target.value as AdminCohortInstructorInput["role"] }))} className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold normal-case tracking-normal text-foreground disabled:opacity-60">
                    <option value="LEAD">Lead</option>
                    <option value="ASSISTANT">Assistant</option>
                    <option value="MAKER">Maker</option>
                    <option value="CHECKER">Checker</option>
                  </select>
                </label>
                <button type="button" disabled={!editable} onClick={addInstructorAssignment} className="self-end rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50 sm:col-span-2 lg:col-span-1">Add role</button>
              </div>

              <div className="mt-5 space-y-2">
                {instructorAssignments.length ? instructorAssignments.map((assignment) => {
                  const course = cohort.courses.find((item) => item.mappingId === assignment.batchCourseId);
                  const instructor = workspace.catalog.instructors.find((item) => item.id === assignment.instructorId);
                  const key = `${assignment.batchCourseId}:${assignment.instructorId}:${assignment.role}`;
                  return (
                    <div key={key} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3">
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">{assignment.role}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{instructor?.name ?? "Unknown instructor"}</p>
                        <p className="truncate text-xs text-muted-foreground">{course?.title ?? "Removed course"} · {instructor?.email}</p>
                      </div>
                      {editable && <button type="button" onClick={() => setInstructorAssignments((current) => current.filter((item) => `${item.batchCourseId}:${item.instructorId}:${item.role}` !== key))} className="rounded-lg border border-border p-2 text-muted-foreground hover:border-destructive/40 hover:text-destructive" aria-label="Remove instructor role"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  );
                }) : <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No instructor roles mapped yet.</p>}
              </div>

              {editable && (
                <button disabled={saving !== null} onClick={() => void saveInstructors()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
                  {saving === "instructors" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save instructor mappings
                </button>
              )}
            </>
          )}
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-3 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Selected courses</p>
            <p className="mt-2 text-3xl font-black">{selectedCourseIds.length}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Selected learners</p>
            <p className="mt-2 text-3xl font-black">{selectedUserIds.length}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Projected enrollments</p>
            <p className="mt-2 text-3xl font-black text-primary">{projectedEnrollments.toLocaleString()}</p>
            <p className="mt-1 text-xs text-muted-foreground">Created automatically when the cohort is active.</p>
          </div>
        </section>

        {cohort.members.some((item) => item.membershipStatus === "WITHDRAWN") && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-black">Membership history</h2>
            <p className="mt-1 text-sm text-muted-foreground">Withdrawn learners remain auditable and their progress is never deleted.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {cohort.members.filter((item) => item.membershipStatus === "WITHDRAWN").map((item) => (
                <span key={item.membershipId} className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs">{item.name} · withdrawn</span>
              ))}
            </div>
          </section>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
          <Layers3 className="h-5 w-5 shrink-0" /> One cohort membership now replaces repetitive learner-by-course assignment while preserving one progress record per learner and course.
        </div>
      </main>
    </AdminLayout>
  );
}
