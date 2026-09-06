"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Plus,
  Radio,
  Save,
  Search,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import type {
  AdminClassCohortOption,
  AdminClassPayload,
  AdminClassStats,
  AdminClassSummary,
  LiveClassStatusValue,
  MeetingTypeValue,
  RecurrencePatternValue,
} from "@/lib/admin-class-types";
import type { AdminCourseSummary } from "@/lib/admin-course-types";
import type { AdminUserSummary } from "@/lib/admin-user-types";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { toast } from "sonner";

const PAGE_SIZE = 9;

const statuses: Array<"all" | LiveClassStatusValue> = [
  "all",
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];
const meetingTypes: MeetingTypeValue[] = [
  "VIDEO_CONFERENCE",
  "WEBINAR",
  "AUDIO_ONLY",
];
const recurrences: RecurrencePatternValue[] = [
  "NONE",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
];

type DateFilterValue =
  | "all"
  | "today"
  | "yesterday"
  | "tomorrow"
  | "last7"
  | "next7"
  | "custom";

const dateFilters: DateFilterValue[] = [
  "all",
  "today",
  "yesterday",
  "tomorrow",
  "last7",
  "next7",
  "custom",
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const dateFilterLabels: Record<DateFilterValue, string> = {
  all: "All Dates",
  today: "Today",
  yesterday: "Yesterday",
  tomorrow: "Tomorrow",
  last7: "Last 7 Days",
  next7: "Next 7 Days",
  custom: "Custom Range",
};

function resolveDateRange(
  filter: DateFilterValue,
  customStart: string,
  customEnd: string,
): { start: Date; end: Date } | null {
  const today = startOfDay(new Date());

  switch (filter) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "yesterday":
      return { start: addDays(today, -1), end: today };
    case "tomorrow":
      return { start: addDays(today, 1), end: addDays(today, 2) };
    case "last7":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "next7":
      return { start: today, end: addDays(today, 8) };
    case "custom": {
      if (!customStart && !customEnd) {
        return null;
      }
      const start = customStart
        ? startOfDay(new Date(customStart))
        : new Date(0);
      const end = customEnd
        ? addDays(startOfDay(new Date(customEnd)), 1)
        : new Date(8640000000000000);
      return { start, end };
    }
    default:
      return null;
  }
}

function statusClass(status: LiveClassStatusValue) {
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

function sessionStatusClass(status: string | null) {
  switch (status) {
    case "LIVE":
      return "text-red-500";
    case "UPCOMING":
      return "text-blue-500";
    case "COMPLETED":
      return "text-green-500";
    case "MISSED":
      return "text-yellow-500";
    case "CANCELLED":
      return "text-slate-400";
    default:
      return "text-muted-foreground";
  }
}

function toDateTimeLocalValue(iso: string | null) {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildEmptyDraft(
  fallbackCourseId: string,
  fallbackInstructorId: string,
  courses: AdminCourseSummary[],
  cohorts: AdminClassCohortOption[],
): AdminClassPayload {
  const cohort =
    cohorts.find(
      (item) =>
        item.courseId === fallbackCourseId &&
        item.instructors.some(
          (instructor) => instructor.id === fallbackInstructorId,
        ),
    ) ??
    cohorts.find((item) => item.courseId === fallbackCourseId) ??
    cohorts[0];
  const course =
    courses.find((item) => item.id === cohort?.courseId) ?? courses[0];
  const instructor =
    cohort?.instructors.find((item) => item.id === fallbackInstructorId) ??
    cohort?.instructors[0];
  return {
    title: "",
    courseId: course?.id ?? "",
    subjectName: course?.title ?? "",
    instructorId: instructor?.id ?? "",
    batchId: cohort?.batchId ?? null,
    batchCourseId: cohort?.batchCourseId ?? null,
    batchName: cohort?.name ?? "",
    status: "SCHEDULED",
    meetingType: "VIDEO_CONFERENCE",
    recurrence: "NONE",
    durationMinutes: 60,
    meetingLink: course ? `https://meet.pstc.edu/${course.id}` : "",
    waitingRoomEnabled: true,
    recordingEnabled: true,
    autoAttendanceEnabled: true,
    scheduledStart: "",
  };
}

export default function ClassManagementCrudPage() {
  const t = useTranslations("adminClassesPage");
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canCreate = can("COURSES", "create");
  const canEdit = can("COURSES", "edit");
  const canDelete = can("COURSES", "delete");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const [classes, setClasses] = useState<AdminClassSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AdminClassStats>({
    total: 0,
    live: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  });
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [instructors, setInstructors] = useState<AdminUserSummary[]>([]);
  const [cohortOptions, setCohortOptions] = useState<AdminClassCohortOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LiveClassStatusValue>("all");
  const [courseId, setCourseId] = useState<"all" | string>("all");
  const [instructorId, setInstructorId] = useState<"all" | string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(t("notice.ready"));
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"courseId" | "instructorId" | "scheduledStart", string>>>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminClassPayload>(
    buildEmptyDraft("", "", [], []),
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminClassSummary | null>(
    null,
  );

  function label(
    key: string,
    fallback: string,
    values?: Record<string, string>,
  ) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const fallbackInstructorId = instructors[0]?.id ?? "";
  const fallbackCourseId = courses[0]?.id ?? "";

  useEffect(() => {
    const handle = setTimeout(() => setQuery(queryInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [queryInput]);

  const dateRange = useMemo(
    () => resolveDateRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd],
  );

  useEffect(() => {
    setPage(1);
  }, [
    query,
    status,
    courseId,
    instructorId,
    dateFilter,
    customStart,
    customEnd,
  ]);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (status !== "all") params.set("status", status);
      if (courseId !== "all") params.set("courseId", courseId);
      if (instructorId !== "all") params.set("instructorId", instructorId);
      if (dateRange) {
        params.set("dateFrom", dateRange.start.toISOString());
        params.set("dateTo", dateRange.end.toISOString());
      }
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const classesRes = await fetch(`/api/admin/classes?${params.toString()}`);
      if (!classesRes.ok) {
        throw new Error("Failed to load classes.");
      }
      const classesData = await classesRes.json();
      setClasses(classesData.classes ?? []);
      setTotal(classesData.total ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load class data.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [query, status, courseId, instructorId, dateRange, page]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const loadStats = useCallback(async () => {
    try {
      const statsRes = await fetch("/api/admin/classes/stats");
      if (!statsRes.ok) return;
      const statsData = await statsRes.json();
      if (statsData.stats) setStats(statsData.stats);
    } catch {
      // Non-critical — stats cards simply keep their last known values.
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const loadReferenceData = useCallback(async () => {
    try {
      const [coursesRes, instructorsRes, cohortsRes] = await Promise.all([
        fetch("/api/admin/courses"),
        fetch("/api/admin/users?role=INSTRUCTOR"),
        fetch("/api/admin/cohorts/options"),
      ]);

      if (!coursesRes.ok || !instructorsRes.ok || !cohortsRes.ok) {
        throw new Error("Failed to load class management data.");
      }

      const coursesData = await coursesRes.json();
      const instructorsData = await instructorsRes.json();
      const cohortsData = await cohortsRes.json();

      setCourses(coursesData.courses ?? []);
      setInstructors(instructorsData.users ?? []);
      setCohortOptions(cohortsData.cohorts ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load class data.";
      setLoadError(message);
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedClasses = classes;

  function openNewClass() {
    setFieldErrors({});
    const nextDraft = buildEmptyDraft(
      courseId === "all" ? fallbackCourseId : courseId,
      instructorId === "all" ? fallbackInstructorId : instructorId,
      courses,
      cohortOptions,
    );
    setEditingId(null);
    setDraft(nextDraft);
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditClass(liveClass: AdminClassSummary) {
    setFieldErrors({});
    setEditingId(liveClass.id);
    setDraft({
      title: liveClass.title,
      courseId: liveClass.courseId,
      subjectName: liveClass.subjectName,
      instructorId: liveClass.instructor?.id ?? "",
      batchId: liveClass.batchId,
      batchCourseId: liveClass.batchCourseId,
      batchName: liveClass.batchName,
      status: liveClass.status,
      meetingType: liveClass.meetingType,
      recurrence: liveClass.recurrence,
      durationMinutes: liveClass.durationMinutes,
      meetingLink: liveClass.meetingLink,
      waitingRoomEnabled: liveClass.waitingRoomEnabled,
      recordingEnabled: liveClass.recordingEnabled,
      autoAttendanceEnabled: liveClass.autoAttendanceEnabled,
      scheduledStart: liveClass.scheduledStart ?? "",
    });
    setNotice(t("notice.editing", { title: liveClass.title }));
    setIsEditorOpen(true);
  }

  function handleCourseChange(nextCourseId: string) {
    setFieldErrors((current) => ({ ...current, courseId: undefined, instructorId: undefined }));
    const course = courses.find((item) => item.id === nextCourseId);
    const cohort = cohortOptions.find((item) => item.courseId === nextCourseId);
    setDraft((current) => ({
      ...current,
      courseId: nextCourseId,
      subjectName: course?.title ?? current.subjectName,
      instructorId: cohort?.instructors[0]?.id ?? "",
      batchId: cohort?.batchId ?? null,
      batchCourseId: cohort?.batchCourseId ?? null,
      batchName: cohort?.name ?? "",
      meetingLink:
        current.meetingLink || !course
          ? current.meetingLink
          : `https://meet.pstc.edu/${nextCourseId}`,
    }));
  }

  function handleCohortChange(batchCourseId: string) {
    const cohort = cohortOptions.find(
      (item) => item.batchCourseId === batchCourseId,
    );
    if (!cohort) return;
    setFieldErrors((current) => ({ ...current, courseId: undefined, instructorId: undefined }));
    setDraft((current) => ({
      ...current,
      batchId: cohort.batchId,
      batchCourseId: cohort.batchCourseId,
      batchName: cohort.name,
      instructorId: cohort.instructors.some(
        (item) => item.id === current.instructorId,
      )
        ? current.instructorId
        : (cohort.instructors[0]?.id ?? ""),
    }));
  }

  async function handleSaveClass() {
    setFieldErrors({});
    if (
      !draft.title.trim() ||
      (!draft.batchCourseId && !(editingId && draft.batchName.trim())) ||
      !draft.meetingLink.trim() ||
      !draft.scheduledStart.trim()
    ) {
      const message = label(
        "notice.requiredFields",
        "Class title, cohort, meeting link, and class date/time are required.",
      );
      setNotice(message);
      setFieldErrors({
        ...(!draft.batchCourseId ? { courseId: "Please select a subject and cohort." } : {}),
        ...(!draft.instructorId ? { instructorId: "Please select an instructor." } : {}),
        ...(!draft.scheduledStart.trim() ? { scheduledStart: "Please select the class date and time." } : {}),
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/admin/classes/${editingId}` : "/api/admin/classes",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as {
          error?: string;
          fieldErrors?: Partial<Record<"courseId" | "instructorId" | "scheduledStart", string>>;
        };
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        throw new Error(data.error ?? "Failed to save class.");
      }

      await Promise.all([loadClasses(), loadStats()]);
      setIsEditorOpen(false);
      setNotice(t("notice.saved"));
      toast.success(t("notice.saved"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save class.";
      setNotice(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClass() {
    if (!deleteTarget) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/classes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete class.");
      }
      setDeleteTarget(null);
      await Promise.all([loadClasses(), loadStats()]);
      setNotice(t("notice.deleted"));
      toast.success(t("notice.deleted"));
    } catch (error) {
      setDeleteTarget(null);
      const message = error instanceof Error ? error.message : "Failed to delete class.";
      setNotice(message);
      toast.error(message);
    }
  }

  return (
    <AdminLayout title={tAdmin("classManagement")}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {tAdmin("classManagement")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {label(
                "subtitle",
                "Manage live classes, instructors, schedules, and meeting settings from one place.",
              )}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={openNewClass}
              disabled={loading || cohortOptions.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {t("actions.newClass")}
            </button>
          )}
        </div>

        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("stats.total", "Total Classes")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.total)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("stats.live", "Live Now")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.live)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("stats.scheduled", "Scheduled")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.scheduled)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("stats.completed", "Completed")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.completed)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border pb-1">
          {statuses.map((item) => {
            const count =
              item === "all"
                ? stats.total
                : item === "SCHEDULED"
                  ? stats.scheduled
                  : item === "ACTIVE"
                    ? stats.live
                    : item === "COMPLETED"
                      ? stats.completed
                      : stats.cancelled;
            const isActive = status === item;
            return (
              <button
                key={item}
                onClick={() => setStatus(item)}
                className={`relative flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                {item === "all" ? label("filters.allStatuses", "All Statuses") : t(`status.${item}`)}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {numberFormatter.format(count)}
                </span>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 grid-cols-2 xl:grid-cols-14">
            <label className="relative xl:col-span-8">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder={label(
                  "filters.searchPlaceholder",
                  "Search by class, batch, course, or instructor...",
                )}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as DateFilterValue)
              }
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
            >
              {dateFilters.map((item) => (
                <option key={item} value={item}>
                  {label(`filters.date.${item}`, dateFilterLabels[item])}
                </option>
              ))}
            </select>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
            >
              <option value="all">
                {label("filters.allCourses", "All Courses")}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <select
              value={instructorId}
              onChange={(event) => setInstructorId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
            >
              <option value="all">
                {label("filters.allInstructors", "All Instructors")}
              </option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
            {dateFilter === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
                />
              </>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {loadError ?? notice}
          </p>
        </section>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            {label("loading", "Loading classes…")}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {paginatedClasses.map((liveClass) => (
              <article
                key={liveClass.id}
                className="flex flex-col rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {liveClass.subjectName}
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-card-foreground">
                      {liveClass.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {liveClass.instructor?.name} | {liveClass.batchName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(liveClass.status)}`}
                  >
                    {t(`status.${liveClass.status}`)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      <span className="text-xs">
                        {label("card.sessions", "Sessions")}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-card-foreground">
                      {numberFormatter.format(liveClass.metrics.sessionCount)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/60 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">
                        {label("card.attendance", "Attendance")}
                      </span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-card-foreground">
                      {numberFormatter.format(liveClass.metrics.attendanceRate)}
                      %
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    <span>
                      {label(
                        "card.durationValue",
                        `${liveClass.durationMinutes} min`,
                        {
                          count: numberFormatter.format(
                            liveClass.durationMinutes,
                          ),
                        },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>{t(`meetingType.${liveClass.meetingType}`)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`h-4 w-4 ${sessionStatusClass(liveClass.metrics.latestSessionStatus)}`}
                    />
                    <span>
                      {liveClass.metrics.nextSessionStart
                        ? label(
                            "card.nextSessionValue",
                            `Next session: ${dateFormatter.format(
                              new Date(liveClass.metrics.nextSessionStart),
                            )}`,
                            {
                              date: dateFormatter.format(
                                new Date(liveClass.metrics.nextSessionStart),
                              ),
                            },
                          )
                        : label(
                            "card.noUpcomingSession",
                            "No upcoming session scheduled.",
                          )}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>{label("card.recordings", "Recordings")}</span>
                    <span className="font-semibold text-card-foreground">
                      {numberFormatter.format(liveClass.metrics.recordingCount)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span>{label("card.participants", "Attendance rows")}</span>
                    <span className="font-semibold text-card-foreground">
                      {numberFormatter.format(liveClass.metrics.attendeeCount)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Link
                    href={`/admin/classes/${liveClass.id}`}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    {label("actions.view", "View")}
                  </Link>
                  {canEdit && (
                    <button
                      onClick={() => openEditClass(liveClass)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      {t("actions.edit")}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget(liveClass)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("actions.delete")}
                    </button>
                  )}
                </div>
              </article>
            ))}

            {paginatedClasses.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {label("empty", "No classes match the current filters.")}
              </div>
            )}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {label(
                "pagination.summary",
                `Page ${numberFormatter.format(page)} of ${numberFormatter.format(
                  totalPages,
                )} | ${numberFormatter.format(total)} classes`,
                {
                  page: numberFormatter.format(page),
                  totalPages: numberFormatter.format(totalPages),
                  total: numberFormatter.format(total),
                },
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {label("pagination.previous", "Previous")}
              </button>
              <button
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label("pagination.next", "Next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {(canCreate || canEdit) && isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                    {t("editor.eyebrow")}
                  </p>
                  <h2 className="text-xl font-bold text-card-foreground">
                    {draft.title || label("editor.newClass", "New Class")}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveClass}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t("editor.save")}
                  </button>
                  <button
                    onClick={() => setIsEditorOpen(false)}
                    aria-label={label("editor.close", "Close")}
                    className="rounded-lg border border-border p-2 hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.classTitle")}
                    </label>
                    <input
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.batch")}
                    </label>
                    <select
                      value={draft.batchCourseId ?? ""}
                      onChange={(event) =>
                        handleCohortChange(event.target.value)
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      {!draft.batchCourseId && editingId && (
                        <option value="">Legacy: {draft.batchName}</option>
                      )}
                      {cohortOptions
                        .filter((item) => item.courseId === draft.courseId)
                        .map((cohort) => (
                          <option
                            key={cohort.batchCourseId}
                            value={cohort.batchCourseId}
                          >
                            {cohort.name} ({cohort.code})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.subject")}
                    </label>
                    <select
                      value={draft.courseId}
                      onChange={(event) =>
                        handleCourseChange(event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.courseId)}
                      className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${fieldErrors.courseId ? "border-destructive focus:ring-destructive/30" : "border-border"}`}
                    >
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.courseId && <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{fieldErrors.courseId}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.instructor")}
                    </label>
                    <select
                      value={draft.instructorId}
                      onChange={(event) =>
                        {
                          setFieldErrors((current) => ({ ...current, instructorId: undefined }));
                          setDraft((current) => ({
                            ...current,
                            instructorId: event.target.value,
                          }));
                        }
                      }
                      aria-invalid={Boolean(fieldErrors.instructorId)}
                      className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${fieldErrors.instructorId ? "border-destructive focus:ring-destructive/30" : "border-border"}`}
                    >
                      {(
                        cohortOptions.find(
                          (item) => item.batchCourseId === draft.batchCourseId,
                        )?.instructors ?? []
                      ).map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.name}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.instructorId && <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{fieldErrors.instructorId}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {label("editor.fields.status", "Status")}
                    </label>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          status: event.target.value as LiveClassStatusValue,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      {statuses
                        .filter((item) => item !== "all")
                        .map((item) => (
                          <option key={item} value={item}>
                            {t(`status.${item}`)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.duration")}
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={draft.durationMinutes}
                      onChange={(event) =>
                        {
                          setFieldErrors((current) => ({ ...current, scheduledStart: undefined }));
                          setDraft((current) => ({
                            ...current,
                            durationMinutes: Number(event.target.value) || 0,
                          }));
                        }
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {label(
                        "editor.fields.scheduledStart",
                        "Class date & time",
                      )}
                    </label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocalValue(draft.scheduledStart)}
                      onChange={(event) =>
                        {
                          setFieldErrors((current) => ({ ...current, scheduledStart: undefined }));
                          setDraft((current) => ({
                            ...current,
                            scheduledStart: event.target.value
                              ? new Date(event.target.value).toISOString()
                              : "",
                          }));
                        }
                      }
                      aria-invalid={Boolean(fieldErrors.scheduledStart)}
                      className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm ${fieldErrors.scheduledStart ? "border-destructive focus:ring-destructive/30" : "border-border"}`}
                    />
                    {fieldErrors.scheduledStart && <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">{fieldErrors.scheduledStart}</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
                    <Video className="h-4 w-4 text-primary" />
                    {t("editor.meetingSettings")}
                  </h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                        {t("editor.fields.meetingType")}
                      </label>
                      <select
                        value={draft.meetingType}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            meetingType: event.target.value as MeetingTypeValue,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      >
                        {meetingTypes.map((item) => (
                          <option key={item} value={item}>
                            {t(`meetingType.${item}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                        {t("editor.fields.recurrence")}
                      </label>
                      <select
                        value={draft.recurrence}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            recurrence: event.target
                              .value as RecurrencePatternValue,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      >
                        {recurrences.map((item) => (
                          <option key={item} value={item}>
                            {t(`recurrence.${item}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                        {label("editor.fields.subjectName", "Subject name")}
                      </label>
                      <input
                        value={draft.subjectName}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            subjectName: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.meetingLink")}
                    </label>
                    <input
                      value={draft.meetingLink}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          meetingLink: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                      {t("editor.fields.waitingRoom")}
                      <input
                        type="checkbox"
                        checked={draft.waitingRoomEnabled}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            waitingRoomEnabled: event.target.checked,
                          }))
                        }
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                      {t("editor.fields.recording")}
                      <input
                        type="checkbox"
                        checked={draft.recordingEnabled}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            recordingEnabled: event.target.checked,
                          }))
                        }
                      />
                    </label>
                    <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                      {t("editor.fields.autoAttendance")}
                      <input
                        type="checkbox"
                        checked={draft.autoAttendanceEnabled}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            autoAttendanceEnabled: event.target.checked,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteTarget && (
          <StudentConfirmModal
            title={label("confirm.deleteTitle", "Delete class?")}
            description={label(
              "confirm.deleteDescription",
              `"${deleteTarget.title}" will be permanently deleted.`,
              {
                title: deleteTarget.title,
              },
            )}
            confirmLabel={label("confirm.deleteConfirm", "Delete")}
            cancelLabel={label("confirm.cancel", "Cancel")}
            danger
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDeleteClass}
          />
        )}
      </div>
    </AdminLayout>
  );
}
