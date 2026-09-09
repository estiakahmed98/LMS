"use client";

import { adminFetch as fetch } from "@/lib/admin-swr";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  MessageSquareText,
  FileDown,
  LockKeyhole,
  Save,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import type {
  AdminClassCohortOption,
  AdminClassDetail,
  AdminClassPayload,
  AttendanceStatusValue,
  LiveClassStatusValue,
  MeetingTypeValue,
  RecurrencePatternValue,
  SessionStatusValue,
} from "@/lib/admin-class-types";
import type { AdminCourseSummary } from "@/lib/admin-course-types";

const statuses: LiveClassStatusValue[] = [
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

function liveClassStatusClass(status: LiveClassStatusValue) {
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

function sessionStatusClass(status: SessionStatusValue) {
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

function attendanceStatusClass(status: AttendanceStatusValue) {
  switch (status) {
    case "PRESENT":
      return "border-green-200 bg-green-50 text-green-700";
    case "LATE":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "ABSENT":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

function isAdminClassLocked(detail: AdminClassDetail) {
  return (
    detail.status === "ACTIVE" ||
    detail.status === "COMPLETED" ||
    detail.sessions.some(
      (session) => session.status === "LIVE" || session.status === "COMPLETED",
    )
  );
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

function toPayload(detail: AdminClassDetail): AdminClassPayload {
  return {
    title: detail.title,
    courseId: detail.courseId,
    subjectName: detail.subjectName,
    instructorId: detail.instructor?.id ?? "",
    batchId: detail.batchId,
    batchCourseId: detail.batchCourseId,
    batchName: detail.batchName,
    status: detail.status,
    meetingType: detail.meetingType,
    recurrence: detail.recurrence,
    durationMinutes: detail.durationMinutes,
    meetingLink: detail.meetingLink,
    waitingRoomEnabled: detail.waitingRoomEnabled,
    recordingEnabled: detail.recordingEnabled,
    autoAttendanceEnabled: detail.autoAttendanceEnabled,
    scheduledStart: detail.scheduledStart ?? "",
  };
}

export default function ClassDetailPage({ classId }: { classId: string }) {
  const t = useTranslations("adminClassesPage");
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canEdit = can("COURSES", "edit");
  const canDelete = can("COURSES", "delete");
  const router = useRouter();
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat(localeTag, {
    timeStyle: "short",
  });

  function label(
    key: string,
    fallback: string,
    values?: Record<string, string>,
  ) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [detail, setDetail] = useState<AdminClassDetail | null>(null);
  const [draft, setDraft] = useState<AdminClassPayload | null>(null);
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [cohortOptions, setCohortOptions] = useState<AdminClassCohortOption[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [classRes, coursesRes, cohortsRes] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`),
        fetch("/api/admin/courses"),
        fetch("/api/admin/cohorts/options"),
      ]);

      if (classRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!classRes.ok || !coursesRes.ok || !cohortsRes.ok) {
        throw new Error("Failed to load class detail.");
      }

      const classData = await classRes.json();
      const coursesData = await coursesRes.json();
      const cohortsData = await cohortsRes.json();

      setDetail(classData.class);
      setDraft(toPayload(classData.class));
      setCourses(coursesData.courses ?? []);
      setCohortOptions(cohortsData.cohorts ?? []);
      setNotice(label("detail.loaded", "Class detail loaded."));
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to load class detail.",
      );
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleCourseChange(nextCourseId: string) {
    const course = courses.find((item) => item.id === nextCourseId);
    const cohort = cohortOptions.find((item) => item.courseId === nextCourseId);
    setDraft((current) =>
      current
        ? {
            ...current,
            courseId: nextCourseId,
            subjectName: course?.title ?? current.subjectName,
            batchId: cohort?.batchId ?? null,
            batchCourseId: cohort?.batchCourseId ?? null,
            batchName: cohort?.name ?? "",
            instructorId: cohort?.instructors[0]?.id ?? "",
          }
        : current,
    );
  }

  function handleCohortChange(batchCourseId: string) {
    const cohort = cohortOptions.find(
      (item) => item.batchCourseId === batchCourseId,
    );
    if (!cohort) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            batchId: cohort.batchId,
            batchCourseId: cohort.batchCourseId,
            batchName: cohort.name,
            instructorId: cohort.instructors.some(
              (item) => item.id === current.instructorId,
            )
              ? current.instructorId
              : (cohort.instructors[0]?.id ?? ""),
          }
        : current,
    );
  }

  async function handleSave() {
    if (!canEdit) {
      return;
    }
    if (!draft) {
      return;
    }
    if (detail && isAdminClassLocked(detail)) {
      setNotice("Live or completed classes cannot be edited.");
      return;
    }
    if (
      !draft.title.trim() ||
      (!draft.batchCourseId && !draft.batchName.trim()) ||
      !draft.meetingLink.trim()
    ) {
      setNotice(
        label(
          "notice.requiredFields",
          "Class title, cohort, and meeting link are required.",
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save class.");
      }
      const data = await response.json();
      setDetail(data.class);
      setDraft(toPayload(data.class));
      setNotice(label("notice.saved", "Class saved."));
      setEditorOpen(false);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to save class.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) {
      return;
    }
    if (detail && isAdminClassLocked(detail)) {
      setDeleteOpen(false);
      setNotice("Live or completed classes cannot be deleted.");
      return;
    }
    setDeleteOpen(false);
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete class.");
      }
      router.push("/admin/classes");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to delete class.",
      );
    }
  }

  async function handleExportPdf() {
    if (!detail || exportingPdf) return;
    setExportingPdf(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Live Class Report", 14, 17);
      doc.setFontSize(13);
      doc.text(detail.title, 14, 25);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${detail.subjectName}  |  ${detail.batchName}  |  Instructor: ${detail.instructor?.name ?? "Unassigned"}`,
        14,
        31,
      );
      doc.text(
        `Status: ${detail.status}  |  Sessions: ${detail.metrics.sessionCount}  |  Attendance: ${detail.metrics.attendanceRate}%  |  Recordings: ${detail.metrics.recordingCount}`,
        14,
        37,
      );
      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth - 14,
        17,
        {
          align: "right",
        },
      );

      autoTable(doc, {
        startY: 43,
        margin: { left: 14, right: 14 },
        head: [
          [
            "#",
            "Student",
            "Session",
            "Status",
            "Join time",
            "Leave time",
            "Duration",
          ],
        ],
        body: detail.attendance.map((row, index) => [
          String(index + 1),
          row.userName ?? "-",
          dateTimeFormatter.format(new Date(row.sessionScheduledStart)),
          row.status,
          row.joinTime ? dateTimeFormatter.format(new Date(row.joinTime)) : "-",
          row.leaveTime
            ? dateTimeFormatter.format(new Date(row.leaveTime))
            : "-",
          row.durationMinutes != null ? `${row.durationMinutes} min` : "-",
        ]),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      doc.save(`class-report-${detail.title.replace(/\s+/g, "-")}.pdf`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Failed to create PDF.",
      );
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title={tAdmin("classManagement")}>
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-64 animate-pulse rounded bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>

          <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
            <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (notFound || !detail || !draft) {
    return (
      <AdminLayout title={tAdmin("classManagement")}>
        <div className="space-y-6 p-6">
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {label("detail.back", "Back to classes")}
          </Link>
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {label("detail.notFound", "Class not found.")}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const classLocked = isAdminClassLocked(detail);

  return (
    <AdminLayout title={draft.title}>
      <div className="space-y-6 p-6">
        <section className="flex flex-wrap items-start justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-primary/15 via-card to-card p-5 shadow-sm md:p-7">
          <div>
            <Link
              href="/admin/classes"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {label("detail.back", "Back to classes")}
            </Link>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
              {draft.subjectName}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-card-foreground">
              {draft.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {detail.instructor?.name} | {draft.batchName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${liveClassStatusClass(draft.status)}`}
            >
              {t(`status.${draft.status}`)}
            </span>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              <FileDown className="h-4 w-4" />
              {exportingPdf ? "Creating PDF..." : "Export PDF"}
            </button>
            {canEdit && !classLocked && (
              <button
                onClick={() => setEditorOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {label("detail.editClass", "Edit Class")}
              </button>
            )}
            {canDelete && !classLocked && (
              <button
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-destructive hover:bg-muted"
              >
                <Trash2 className="h-4 w-4" />
                {t("actions.delete")}
              </button>
            )}
          </div>
        </section>

        {classLocked && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Class details are locked</p>
              <p className="mt-0.5 text-xs opacity-90">
                Live and completed classes are read-only and cannot be edited or
                deleted.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("card.sessions", "Sessions")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.sessionCount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("card.recordings", "Recordings")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.recordingCount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("card.participants", "Attendance rows")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.attendeeCount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              {label("card.attendance", "Attendance")}
            </p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.attendanceRate)}%
            </p>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="contents">
            {/* =========================================================
        CLASS EDIT MODAL
    ========================================================== */}
            {editorOpen && draft && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-[2px] sm:p-5"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setEditorOpen(false);
                  }
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="class-editor-title"
                  className="
            flex
            max-h-[94vh]
            w-full
            max-w-6xl
            flex-col
            overflow-hidden
            rounded-2xl
            border
            border-border/80
            bg-background
            shadow-2xl
          "
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  {/* ================= HEADER ================= */}
                  <div
                    className="
              flex
              shrink-0
              items-start
              justify-between
              gap-4
              border-b
              border-border
              bg-background/95
              px-5
              py-4
              backdrop-blur
              sm:items-center
              sm:px-6
            "
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <CalendarDays className="h-4 w-4 text-primary" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary">
                            {t("editor.eyebrow")}
                          </p>

                          <h2
                            id="class-editor-title"
                            className="truncate text-lg font-bold text-card-foreground sm:text-xl"
                          >
                            {label(
                              "detail.managementTitle",
                              "Class Management",
                            )}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <div className="hidden text-right lg:block">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {label("detail.updatedAt", "Created {date}", {
                            date: dateTimeFormatter.format(
                              new Date(detail.createdAt),
                            ),
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        aria-label={label("editor.close", "Close editor")}
                        className="
                  inline-flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-border
                  bg-background
                  text-muted-foreground
                  transition
                  hover:bg-muted
                  hover:text-foreground
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/30
                "
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* ================= SCROLLABLE BODY ================= */}
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <div className="space-y-6 p-5 sm:p-6">
                      {/* ================= GENERAL INFORMATION ================= */}
                      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                        <div className="mb-5">
                          <h3 className="text-base font-bold text-card-foreground">
                            Class Information
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Update the class, course, batch and instructor
                            information.
                          </p>
                        </div>

                        <fieldset
                          disabled={!canEdit || classLocked}
                          className="grid gap-x-5 gap-y-4 md:grid-cols-2"
                        >
                          {/* Class title */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.classTitle")}
                            </label>

                            <input
                              value={draft.title}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        title: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="Enter class title"
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        text-foreground
                        outline-none
                        transition
                        placeholder:text-muted-foreground/60
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                            />
                          </div>

                          {/* Batch */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.batch")}
                            </label>

                            <select
                              value={draft.batchCourseId ?? ""}
                              onChange={(event) =>
                                handleCohortChange(event.target.value)
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        text-foreground
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                            >
                              {!draft.batchCourseId && (
                                <option value="">
                                  Legacy: {draft.batchName}
                                </option>
                              )}

                              {cohortOptions
                                .filter(
                                  (item) => item.courseId === draft.courseId,
                                )
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

                          {/* Subject / course */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.subject")}
                            </label>

                            <select
                              value={draft.courseId}
                              onChange={(event) =>
                                handleCourseChange(event.target.value)
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        text-foreground
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                            >
                              {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {course.title}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Subject name */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {label(
                                "editor.fields.subjectName",
                                "Subject name",
                              )}
                            </label>

                            <input
                              value={draft.subjectName}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        subjectName: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="Enter subject name"
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        text-foreground
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                            />
                          </div>

                          {/* Instructor */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.instructor")}
                            </label>

                            <select
                              value={draft.instructorId}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        instructorId: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        text-foreground
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                            >
                              <option value="">Select instructor</option>

                              {(
                                cohortOptions.find(
                                  (item) =>
                                    item.batchCourseId === draft.batchCourseId,
                                )?.instructors ?? []
                              ).map((instructor) => (
                                <option
                                  key={instructor.id}
                                  value={instructor.id}
                                >
                                  {instructor.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Status */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {label("editor.fields.status", "Status")}
                            </label>

                            <select
                              value={draft.status}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        status: event.target
                                          .value as LiveClassStatusValue,
                                      }
                                    : current,
                                )
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        text-foreground
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                      "
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {t(`status.${status}`)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </fieldset>
                      </section>

                      {/* ================= SCHEDULE ================= */}
                      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                        <div className="mb-5">
                          <h3 className="text-base font-bold text-card-foreground">
                            Schedule & Meeting
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Manage date, duration, meeting type and recurrence.
                          </p>
                        </div>

                        <fieldset
                          disabled={!canEdit || classLocked}
                          className="grid gap-x-5 gap-y-4 md:grid-cols-2"
                        >
                          {/* Meeting type */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.meetingType")}
                            </label>

                            <select
                              value={draft.meetingType}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        meetingType: event.target
                                          .value as MeetingTypeValue,
                                      }
                                    : current,
                                )
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                      "
                            >
                              {meetingTypes.map((meetingType) => (
                                <option key={meetingType} value={meetingType}>
                                  {t(`meetingType.${meetingType}`)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Recurrence */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.recurrence")}
                            </label>

                            <select
                              value={draft.recurrence}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        recurrence: event.target
                                          .value as RecurrencePatternValue,
                                      }
                                    : current,
                                )
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                      "
                            >
                              {recurrences.map((recurrence) => (
                                <option key={recurrence} value={recurrence}>
                                  {t(`recurrence.${recurrence}`)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Duration */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.duration")}
                            </label>

                            <div className="relative">
                              <input
                                type="number"
                                min={5}
                                value={draft.durationMinutes}
                                onChange={(event) =>
                                  setDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          durationMinutes:
                                            Number(event.target.value) || 0,
                                        }
                                      : current,
                                  )
                                }
                                className="
                          h-11
                          w-full
                          rounded-xl
                          border
                          border-border
                          bg-background
                          px-3.5
                          pr-20
                          text-sm
                          outline-none
                          transition
                          hover:border-primary/40
                          focus:border-primary
                          focus:ring-4
                          focus:ring-primary/10
                        "
                              />

                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                                minutes
                              </span>
                            </div>
                          </div>

                          {/* Date */}
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t.has("editor.fields.scheduledStart")
                                ? t("editor.fields.scheduledStart")
                                : "Class date & time"}
                            </label>

                            <input
                              type="datetime-local"
                              value={toDateTimeLocalValue(draft.scheduledStart)}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        scheduledStart: event.target.value
                                          ? new Date(
                                              event.target.value,
                                            ).toISOString()
                                          : "",
                                      }
                                    : current,
                                )
                              }
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        outline-none
                        transition
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                      "
                            />
                          </div>

                          {/* Meeting link */}
                          <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                              {t("editor.fields.meetingLink")}
                            </label>

                            <input
                              value={draft.meetingLink}
                              onChange={(event) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        meetingLink: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="https://meet.example.com/..."
                              className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-border
                        bg-background
                        px-3.5
                        text-sm
                        outline-none
                        transition
                        placeholder:text-muted-foreground/60
                        hover:border-primary/40
                        focus:border-primary
                        focus:ring-4
                        focus:ring-primary/10
                      "
                            />
                          </div>
                        </fieldset>
                      </section>

                      {/* ================= CLASS SETTINGS ================= */}
                      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                        <div className="mb-5">
                          <h3 className="text-base font-bold text-card-foreground">
                            Class Settings
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            Configure learner access and automatic class
                            features.
                          </p>
                        </div>

                        <fieldset
                          disabled={!canEdit || classLocked}
                          className="grid gap-3 md:grid-cols-3"
                        >
                          {/* Waiting Room */}
                          <label
                            className={`
                      group
                      flex
                      cursor-pointer
                      items-center
                      justify-between
                      gap-4
                      rounded-xl
                      border
                      p-4
                      transition
                      ${
                        draft.waitingRoomEnabled
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background hover:border-primary/30"
                      }
                    `}
                          >
                            <div>
                              <p className="text-sm font-semibold text-card-foreground">
                                {t("editor.fields.waitingRoom")}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                Learners wait before joining.
                              </p>
                            </div>

                            <div className="relative shrink-0">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={draft.waitingRoomEnabled}
                                onChange={(event) =>
                                  setDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          waitingRoomEnabled:
                                            event.target.checked,
                                        }
                                      : current,
                                  )
                                }
                              />

                              <div className="h-6 w-11 rounded-full bg-muted-foreground/25 transition peer-checked:bg-primary" />

                              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                            </div>
                          </label>

                          {/* Recording */}
                          <label
                            className={`
                      group
                      flex
                      cursor-pointer
                      items-center
                      justify-between
                      gap-4
                      rounded-xl
                      border
                      p-4
                      transition
                      ${
                        draft.recordingEnabled
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background hover:border-primary/30"
                      }
                    `}
                          >
                            <div>
                              <p className="text-sm font-semibold text-card-foreground">
                                {t("editor.fields.recording")}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                Allow class recording.
                              </p>
                            </div>

                            <div className="relative shrink-0">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={draft.recordingEnabled}
                                onChange={(event) =>
                                  setDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          recordingEnabled:
                                            event.target.checked,
                                        }
                                      : current,
                                  )
                                }
                              />

                              <div className="h-6 w-11 rounded-full bg-muted-foreground/25 transition peer-checked:bg-primary" />

                              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                            </div>
                          </label>

                          {/* Auto Attendance */}
                          <label
                            className={`
                      group
                      flex
                      cursor-pointer
                      items-center
                      justify-between
                      gap-4
                      rounded-xl
                      border
                      p-4
                      transition
                      ${
                        draft.autoAttendanceEnabled
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-background hover:border-primary/30"
                      }
                    `}
                          >
                            <div>
                              <p className="text-sm font-semibold text-card-foreground">
                                {t("editor.fields.autoAttendance")}
                              </p>

                              <p className="mt-1 text-xs text-muted-foreground">
                                Track learner attendance automatically.
                              </p>
                            </div>

                            <div className="relative shrink-0">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={draft.autoAttendanceEnabled}
                                onChange={(event) =>
                                  setDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          autoAttendanceEnabled:
                                            event.target.checked,
                                        }
                                      : current,
                                  )
                                }
                              />

                              <div className="h-6 w-11 rounded-full bg-muted-foreground/25 transition peer-checked:bg-primary" />

                              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                            </div>
                          </label>
                        </fieldset>
                      </section>

                      {/* Mobile created date */}
                      <div className="rounded-xl bg-muted/50 px-4 py-3 lg:hidden">
                        <p className="text-xs text-muted-foreground">
                          {label("detail.updatedAt", "Created {date}", {
                            date: dateTimeFormatter.format(
                              new Date(detail.createdAt),
                            ),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ================= FOOTER ================= */}
                  <div
                    className="
              flex
              shrink-0
              flex-col-reverse
              gap-2
              border-t
              border-border
              bg-background/95
              px-5
              py-4
              backdrop-blur
              sm:flex-row
              sm:items-center
              sm:justify-between
              sm:px-6
            "
                  >
                    <div className="text-xs text-muted-foreground">
                      {classLocked ? (
                        <span>
                          This class is locked and cannot currently be edited.
                        </span>
                      ) : !canEdit ? (
                        <span>
                          You do not have permission to edit this class.
                        </span>
                      ) : (
                        <span>Review your changes before saving.</span>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-border
                  bg-background
                  px-4
                  text-sm
                  font-semibold
                  text-foreground
                  transition
                  hover:bg-muted
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/20
                "
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving || !canEdit || classLocked}
                        className="
                  inline-flex
                  h-10
                  min-w-[130px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-primary
                  px-4
                  text-sm
                  font-semibold
                  text-primary-foreground
                  shadow-sm
                  transition
                  hover:bg-primary/90
                  focus:outline-none
                  focus:ring-4
                  focus:ring-primary/20
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
                      >
                        <Save className="h-4 w-4" />

                        {saving
                          ? label("detail.saving", "Saving...")
                          : label("detail.saveChanges", "Save Changes")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
        RECORDING + CHAT
    ========================================================== */}
            <div className="contents">
              <section className="h-80 overflow-y-auto rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-card-foreground">
                    {label("detail.recordingSummary", "Recording Summary")}
                  </h2>
                </div>

                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {detail.sessions.filter((session) => session.recordingUrl)
                    .length > 0 ? (
                    detail.sessions
                      .filter((session) => session.recordingUrl)
                      .map((session) => (
                        <div
                          key={session.id}
                          className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    rounded-xl
                    border
                    border-border
                    px-3
                    py-2.5
                    transition
                    hover:bg-muted/40
                  "
                        >
                          <div>
                            <p className="font-medium text-card-foreground">
                              {dateTimeFormatter.format(
                                new Date(session.scheduledStart),
                              )}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {label(
                                "detail.recordingSize",
                                "Size: {size} MB",
                                {
                                  size: session.recordingSizeMb
                                    ? numberFormatter.format(
                                        session.recordingSizeMb,
                                      )
                                    : "0",
                                },
                              )}
                            </p>
                          </div>

                          <a
                            href={session.recordingUrl ?? "#"}
                            className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      border
                      border-border
                      px-2.5
                      py-1.5
                      text-xs
                      font-semibold
                      transition
                      hover:bg-muted
                    "
                          >
                            <Download className="h-3.5 w-3.5" />
                            {label("detail.openRecording", "Open")}
                          </a>
                        </div>
                      ))
                  ) : (
                    <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border">
                      <div className="text-center">
                        <Video className="mx-auto h-7 w-7 text-muted-foreground/50" />

                        <p className="mt-2 text-sm text-muted-foreground">
                          {label(
                            "detail.noRecordings",
                            "No recordings available for this class yet.",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="h-80 overflow-y-auto rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />

                  <h2 className="font-semibold text-card-foreground">
                    {label("detail.chatSummary", "Chat Activity")}
                  </h2>
                </div>

                <div className="mt-5 rounded-xl bg-muted/50 p-4">
                  <p className="text-3xl font-bold text-card-foreground">
                    {numberFormatter.format(detail.metrics.chatMessageCount)}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {label(
                      "detail.chatSummaryText",
                      "Messages across all recorded sessions.",
                    )}
                  </p>
                </div>
              </section>
            </div>
          </section>

          {/* =========================================================
      SESSION TIMELINE
  ========================================================== */}
          <section className="h-80 overflow-y-auto rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />

              <h2 className="font-semibold text-card-foreground">
                {label("detail.sessionsTitle", "Session Timeline")}
              </h2>
            </div>

            <div className="mt-4 space-y-3">
              {detail.sessions.length > 0 ? (
                detail.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="
              rounded-xl
              border
              border-border
              p-4
              transition
              hover:border-primary/20
              hover:bg-muted/20
            "
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-card-foreground">
                          {dateTimeFormatter.format(
                            new Date(session.scheduledStart),
                          )}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {timeFormatter.format(
                            new Date(session.scheduledStart),
                          )}{" "}
                          -{" "}
                          {timeFormatter.format(new Date(session.scheduledEnd))}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${sessionStatusClass(
                          session.status,
                        )}`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
                        <p className="text-xs text-muted-foreground">
                          {label("detail.sessionAttendees", "Attendance rows")}
                        </p>

                        <p className="mt-1 font-semibold text-card-foreground">
                          {numberFormatter.format(session.attendeeCount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
                        <p className="text-xs text-muted-foreground">
                          {label("detail.sessionMessages", "Chat messages")}
                        </p>

                        <p className="mt-1 font-semibold text-card-foreground">
                          {numberFormatter.format(session.chatMessageCount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-sm">
                        <p className="text-xs text-muted-foreground">
                          {label("detail.sessionRecording", "Recording")}
                        </p>

                        <p className="mt-1 font-semibold text-card-foreground">
                          {session.recordingUrl
                            ? label("detail.available", "Available")
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-border">
                  <div className="text-center">
                    <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground/50" />

                    <p className="mt-2 text-sm text-muted-foreground">
                      {label(
                        "detail.noSessions",
                        "No sessions scheduled for this class yet.",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-card-foreground">
              {label("detail.attendanceTitle", "Attendance Breakdown")}
            </h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">
                    {label("detail.table.student", "Student")}
                  </th>
                  <th className="px-4 py-3">
                    {label("detail.table.session", "Session")}
                  </th>
                  <th className="px-4 py-3">
                    {label("detail.table.status", "Status")}
                  </th>
                  <th className="px-4 py-3">
                    {label("detail.table.joinTime", "Join Time")}
                  </th>
                  <th className="px-4 py-3">
                    {label("detail.table.duration", "Duration")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {detail.attendance.length > 0 ? (
                  detail.attendance.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-card-foreground">
                        {row.userName ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {dateTimeFormatter.format(
                          new Date(row.sessionScheduledStart),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${attendanceStatusClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.joinTime
                          ? dateTimeFormatter.format(new Date(row.joinTime))
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.durationMinutes
                          ? `${numberFormatter.format(row.durationMinutes)} min`
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      {label(
                        "detail.noAttendance",
                        "No attendance records found for this class.",
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {deleteOpen && (
          <StudentConfirmModal
            title={label("confirm.deleteTitle", "Delete class?")}
            description={label(
              "confirm.deleteDescription",
              `"${draft.title}" will be permanently deleted.`,
              { title: draft.title },
            )}
            confirmLabel={label("confirm.deleteConfirm", "Delete")}
            cancelLabel={label("confirm.cancel", "Cancel")}
            danger
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    </AdminLayout>
  );
}
