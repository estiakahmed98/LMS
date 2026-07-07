"use client";

import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useHasMounted } from "@/lib/use-has-mounted";
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
import {
  getAttendanceBySessionId,
  getInstructors,
  getSessionsByLiveClassId,
  getUserById,
  mockCourses,
  mockLiveClasses,
  type LiveClass,
  type LiveClassStatus,
  type MeetingType,
  type RecurrencePattern,
  type SessionStatus,
} from "@/lib/mock-data";

const PAGE_SIZE = 9;

const statuses: Array<"all" | LiveClassStatus> = [
  "all",
  "SCHEDULED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];
const meetingTypes: MeetingType[] = [
  "VIDEO_CONFERENCE",
  "WEBINAR",
  "AUDIO_ONLY",
];
const recurrences: RecurrencePattern[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

function statusClass(status: LiveClassStatus) {
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
      return "text-red-500";
    case "UPCOMING":
      return "text-blue-500";
    case "COMPLETED":
      return "text-green-500";
    case "MISSED":
      return "text-yellow-500";
    case "CANCELLED":
      return "text-slate-400";
  }
}

function buildEmptyDraft(index: number, fallbackCourseId: string, fallbackInstructorId: string) {
  const course = mockCourses.find((item) => item.id === fallbackCourseId) ?? mockCourses[0];
  return {
    id: `live_new_${index}`,
    title: "",
    courseId: course?.id ?? "",
    subjectName: course?.title ?? "",
    instructorId: fallbackInstructorId,
    batchName: "",
    status: "SCHEDULED" as LiveClassStatus,
    meetingType: "VIDEO_CONFERENCE" as MeetingType,
    recurrence: "NONE" as RecurrencePattern,
    durationMinutes: 60,
    meetingLink: course ? `https://meet.pstc.edu/live_new_${index}` : "",
    waitingRoomEnabled: true,
    recordingEnabled: true,
    autoAttendanceEnabled: true,
    createdAt: new Date(),
  };
}

export default function ClassManagementCrudPage() {
  const t = useTranslations("adminClassesPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const instructors = getInstructors();
  const fallbackInstructorId = instructors[0]?.id ?? "";
  const fallbackCourseId = mockCourses[0]?.id ?? "";
  const hasMounted = useHasMounted();

  const [classes, setClasses] = useState<LiveClass[]>(mockLiveClasses);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | LiveClassStatus>("all");
  const [courseId, setCourseId] = useState<"all" | string>("all");
  const [instructorId, setInstructorId] = useState<"all" | string>("all");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(t("notice.ready"));
  const [saving, setSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LiveClass>(
    buildEmptyDraft(classes.length + 1, fallbackCourseId, fallbackInstructorId),
  );
  const [deleteTarget, setDeleteTarget] = useState<LiveClass | null>(null);

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const classMetrics = useMemo(() => {
    return new Map(
      classes.map((liveClass) => {
        const sessions = getSessionsByLiveClassId(liveClass.id);
        const totalAttendance = sessions.flatMap((session) =>
          getAttendanceBySessionId(session.id),
        );
        const presentCount = totalAttendance.filter(
          (attendance) => attendance.status === "PRESENT" || attendance.status === "LATE",
        ).length;
        const attendanceRate =
          totalAttendance.length > 0
            ? Math.round((presentCount / totalAttendance.length) * 100)
            : 0;
        const nextSession = [...sessions]
          .filter((session) => session.scheduledStart.getTime() >= Date.now())
          .sort(
            (first, second) =>
              first.scheduledStart.getTime() - second.scheduledStart.getTime(),
          )[0];
        const latestSession = [...sessions].sort(
          (first, second) =>
            second.scheduledStart.getTime() - first.scheduledStart.getTime(),
        )[0];

        return [
          liveClass.id,
          {
            sessions,
            nextSession,
            latestSession,
            recordingCount: sessions.filter((session) => session.recordingUrl).length,
            attendanceRate,
            participantCount: totalAttendance.length,
          },
        ];
      }),
    );
  }, [classes]);

  const stats = useMemo(
    () => ({
      total: classes.length,
      live: classes.filter((item) => item.status === "ACTIVE").length,
      scheduled: classes.filter((item) => item.status === "SCHEDULED").length,
      completed: classes.filter((item) => item.status === "COMPLETED").length,
    }),
    [classes],
  );

  const filteredClasses = useMemo(
    () =>
      classes.filter((liveClass) => {
        const instructor = getUserById(liveClass.instructorId);
        const normalizedQuery = query.toLowerCase();
        const matchesQuery =
          liveClass.title.toLowerCase().includes(normalizedQuery) ||
          liveClass.batchName.toLowerCase().includes(normalizedQuery) ||
          liveClass.subjectName.toLowerCase().includes(normalizedQuery) ||
          instructor?.name.toLowerCase().includes(normalizedQuery);
        const matchesStatus = status === "all" || liveClass.status === status;
        const matchesCourse = courseId === "all" || liveClass.courseId === courseId;
        const matchesInstructor =
          instructorId === "all" || liveClass.instructorId === instructorId;
        return matchesQuery && matchesStatus && matchesCourse && matchesInstructor;
      }),
    [classes, query, status, courseId, instructorId],
  );

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, status, courseId, instructorId]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedClasses = useMemo(
    () => filteredClasses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredClasses, page],
  );

  function openNewClass() {
    const nextDraft = buildEmptyDraft(
      classes.length + 1,
      courseId === "all" ? fallbackCourseId : courseId,
      instructorId === "all" ? fallbackInstructorId : instructorId,
    );
    setEditingId(null);
    setDraft(nextDraft);
    setNotice(t("notice.newDraftReady"));
    setIsEditorOpen(true);
  }

  function openEditClass(liveClass: LiveClass) {
    setEditingId(liveClass.id);
    setDraft({ ...liveClass });
    setNotice(t("notice.editing", { title: liveClass.title }));
    setIsEditorOpen(true);
  }

  function handleCourseChange(nextCourseId: string) {
    const course = mockCourses.find((item) => item.id === nextCourseId);
    setDraft((current) => ({
      ...current,
      courseId: nextCourseId,
      subjectName: course?.title ?? current.subjectName,
      meetingLink:
        current.meetingLink || !course
          ? current.meetingLink
          : `https://meet.pstc.edu/${nextCourseId}`,
    }));
  }

  function handleSaveClass() {
    if (!draft.title.trim() || !draft.batchName.trim() || !draft.meetingLink.trim()) {
      setNotice(
        label(
          "notice.requiredFields",
          "Class title, batch name, and meeting link are required.",
        ),
      );
      return;
    }

    setSaving(true);
    const payload = {
      ...draft,
      title: draft.title.trim(),
      batchName: draft.batchName.trim(),
      meetingLink: draft.meetingLink.trim(),
    };

    setClasses((current) => {
      if (!editingId) {
        return [{ ...payload }, ...current];
      }
      return current.map((item) => (item.id === editingId ? payload : item));
    });

    setSaving(false);
    setIsEditorOpen(false);
    setNotice(t("notice.saved"));
  }

  function handleDeleteClass() {
    if (!deleteTarget) {
      return;
    }
    setClasses((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
    setNotice(t("notice.deleted"));
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
          <button
            onClick={openNewClass}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            {t("actions.newClass")}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 xl:grid-cols-[1fr_180px_220px_220px]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={label(
                  "filters.searchPlaceholder",
                  "Search by class, batch, course, or instructor...",
                )}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "all" | LiveClassStatus)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item === "all"
                    ? label("filters.allStatuses", "All Statuses")
                    : t(`status.${item}`)}
                </option>
              ))}
            </select>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">{label("filters.allCourses", "All Courses")}</option>
              {mockCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <select
              value={instructorId}
              onChange={(event) => setInstructorId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
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
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{notice}</p>
        </section>

        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {paginatedClasses.map((liveClass) => {
            const instructor = getUserById(liveClass.instructorId);
            const metrics = classMetrics.get(liveClass.id);
            return (
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
                      {instructor?.name} | {liveClass.batchName}
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
                      <span className="text-xs">{label("card.sessions", "Sessions")}</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-card-foreground">
                      {numberFormatter.format(metrics?.sessions.length ?? 0)}
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
                      {numberFormatter.format(metrics?.attendanceRate ?? 0)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    <span>
                      {label("card.durationValue", `${liveClass.durationMinutes} min`, {
                        count: numberFormatter.format(liveClass.durationMinutes),
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span>{t(`meetingType.${liveClass.meetingType}`)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`h-4 w-4 ${
                        metrics?.latestSession
                          ? sessionStatusClass(metrics.latestSession.status)
                          : "text-muted-foreground"
                      }`}
                    />
                    <span>
                      {!hasMounted
                        ? " "
                        : metrics?.nextSession
                          ? label(
                              "card.nextSessionValue",
                              `Next session: ${dateFormatter.format(
                                metrics.nextSession.scheduledStart,
                              )}`,
                              {
                                date: dateFormatter.format(
                                  metrics.nextSession.scheduledStart,
                                ),
                              },
                            )
                          : label("card.noUpcomingSession", "No upcoming session scheduled.")}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>{label("card.recordings", "Recordings")}</span>
                    <span className="font-semibold text-card-foreground">
                      {numberFormatter.format(metrics?.recordingCount ?? 0)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span>{label("card.participants", "Attendance rows")}</span>
                    <span className="font-semibold text-card-foreground">
                      {numberFormatter.format(metrics?.participantCount ?? 0)}
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
                  <button
                    onClick={() => openEditClass(liveClass)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    {t("actions.edit")}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(liveClass)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("actions.delete")}
                  </button>
                </div>
              </article>
            );
          })}

          {paginatedClasses.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {label("empty", "No classes match the current filters.")}
            </div>
          )}
        </div>

        {filteredClasses.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {label(
                "pagination.summary",
                `Page ${numberFormatter.format(page)} of ${numberFormatter.format(
                  totalPages,
                )} | ${numberFormatter.format(filteredClasses.length)} classes`,
                {
                  page: numberFormatter.format(page),
                  totalPages: numberFormatter.format(totalPages),
                  total: numberFormatter.format(filteredClasses.length),
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
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label("pagination.next", "Next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {isEditorOpen && (
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
                        setDraft((current) => ({ ...current, title: event.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.batch")}
                    </label>
                    <input
                      value={draft.batchName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          batchName: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.subject")}
                    </label>
                    <select
                      value={draft.courseId}
                      onChange={(event) => handleCourseChange(event.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      {mockCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.instructor")}
                    </label>
                    <select
                      value={draft.instructorId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          instructorId: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.name}
                        </option>
                      ))}
                    </select>
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
                          status: event.target.value as LiveClassStatus,
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
                        setDraft((current) => ({
                          ...current,
                          durationMinutes: Number(event.target.value) || 0,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
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
                            meetingType: event.target.value as MeetingType,
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
                            recurrence: event.target.value as RecurrencePattern,
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
              `"${deleteTarget.title}" will be removed from the mock class list.`,
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

