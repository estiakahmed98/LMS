"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  LoaderCircle,
  MessageSquareText,
  Save,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import type {
  AdminClassDetail,
  AdminClassPayload,
  AttendanceStatusValue,
  LiveClassStatusValue,
  MeetingTypeValue,
  RecurrencePatternValue,
  SessionStatusValue,
} from "@/lib/admin-class-types";
import type { AdminCourseSummary } from "@/lib/admin-course-types";
import type { AdminUserSummary } from "@/lib/admin-user-types";

const statuses: LiveClassStatusValue[] = ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"];
const meetingTypes: MeetingTypeValue[] = ["VIDEO_CONFERENCE", "WEBINAR", "AUDIO_ONLY"];
const recurrences: RecurrencePatternValue[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

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

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [detail, setDetail] = useState<AdminClassDetail | null>(null);
  const [draft, setDraft] = useState<AdminClassPayload | null>(null);
  const [courses, setCourses] = useState<AdminCourseSummary[]>([]);
  const [instructors, setInstructors] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [classRes, coursesRes, instructorsRes] = await Promise.all([
        fetch(`/api/admin/classes/${classId}`),
        fetch("/api/admin/courses"),
        fetch("/api/admin/users?role=INSTRUCTOR"),
      ]);

      if (classRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!classRes.ok || !coursesRes.ok || !instructorsRes.ok) {
        throw new Error("Failed to load class detail.");
      }

      const classData = await classRes.json();
      const coursesData = await coursesRes.json();
      const instructorsData = await instructorsRes.json();

      setDetail(classData.class);
      setDraft(toPayload(classData.class));
      setCourses(coursesData.courses ?? []);
      setInstructors(instructorsData.users ?? []);
      setNotice(label("detail.loaded", "Class detail loaded."));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to load class detail.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleCourseChange(nextCourseId: string) {
    const course = courses.find((item) => item.id === nextCourseId);
    setDraft((current) =>
      current
        ? {
            ...current,
            courseId: nextCourseId,
            subjectName: course?.title ?? current.subjectName,
          }
        : current,
    );
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save class.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
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
      setNotice(error instanceof Error ? error.message : "Failed to delete class.");
    }
  }

  if (loading) {
    return (
      <AdminLayout title={tAdmin("classManagement")}>
        <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          {label("loading", "Loading class detail…")}
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

  return (
    <AdminLayout title={draft.title}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
            <h1 className="mt-1 text-3xl font-bold text-card-foreground">{draft.title}</h1>
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
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {label("detail.saveChanges", "Save Changes")}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-destructive hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" />
              {t("actions.delete")}
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.sessions", "Sessions")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.sessionCount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.recordings", "Recordings")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.recordingCount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.participants", "Attendance rows")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.attendeeCount)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.attendance", "Attendance")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(detail.metrics.attendanceRate)}%
            </p>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {t("editor.eyebrow")}
                </p>
                <h2 className="mt-1 text-xl font-bold text-card-foreground">
                  {label("detail.managementTitle", "Class Management")}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {label("detail.updatedAt", "Created {date}", {
                  date: dateTimeFormatter.format(new Date(detail.createdAt)),
                })}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  {t("editor.fields.classTitle")}
                </label>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, title: event.target.value } : current,
                    )
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
                    setDraft((current) =>
                      current ? { ...current, batchName: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  {t("editor.fields.subject")}
                </label>
                <select
                  value={draft.courseId}
                  onChange={(event) => handleCourseChange(event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
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
                    setDraft((current) =>
                      current ? { ...current, subjectName: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  {t("editor.fields.instructor")}
                </label>
                <select
                  value={draft.instructorId}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, instructorId: event.target.value } : current,
                    )
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
                    setDraft((current) =>
                      current
                        ? { ...current, status: event.target.value as LiveClassStatusValue }
                        : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {t(`status.${status}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  {t("editor.fields.meetingType")}
                </label>
                <select
                  value={draft.meetingType}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, meetingType: event.target.value as MeetingTypeValue }
                        : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {meetingTypes.map((meetingType) => (
                    <option key={meetingType} value={meetingType}>
                      {t(`meetingType.${meetingType}`)}
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
                    setDraft((current) =>
                      current
                        ? { ...current, recurrence: event.target.value as RecurrencePatternValue }
                        : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {recurrences.map((recurrence) => (
                    <option key={recurrence} value={recurrence}>
                      {t(`recurrence.${recurrence}`)}
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
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            durationMinutes: Number(event.target.value) || 0,
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                  {t("editor.fields.meetingLink")}
                </label>
                <input
                  value={draft.meetingLink}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, meetingLink: event.target.value } : current,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                {t("editor.fields.waitingRoom")}
                <input
                  type="checkbox"
                  checked={draft.waitingRoomEnabled}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, waitingRoomEnabled: event.target.checked }
                        : current,
                    )
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                {t("editor.fields.recording")}
                <input
                  type="checkbox"
                  checked={draft.recordingEnabled}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, recordingEnabled: event.target.checked }
                        : current,
                    )
                  }
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                {t("editor.fields.autoAttendance")}
                <input
                  type="checkbox"
                  checked={draft.autoAttendanceEnabled}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, autoAttendanceEnabled: event.target.checked }
                        : current,
                    )
                  }
                />
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-card-foreground">
                  {label("detail.recordingSummary", "Recording Summary")}
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {detail.sessions.filter((session) => session.recordingUrl).length > 0 ? (
                  detail.sessions
                    .filter((session) => session.recordingUrl)
                    .map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                      >
                        <div>
                          <p className="font-medium text-card-foreground">
                            {dateTimeFormatter.format(new Date(session.scheduledStart))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {label("detail.recordingSize", "Size: {size} MB", {
                              size: session.recordingSizeMb
                                ? numberFormatter.format(session.recordingSizeMb)
                                : "0",
                            })}
                          </p>
                        </div>
                        <a
                          href={session.recordingUrl ?? "#"}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {label("detail.openRecording", "Open")}
                        </a>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {label("detail.noRecordings", "No recordings available for this class yet.")}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-card-foreground">
                  {label("detail.chatSummary", "Chat Activity")}
                </h2>
              </div>
              <p className="mt-4 text-3xl font-bold text-card-foreground">
                {numberFormatter.format(detail.metrics.chatMessageCount)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {label("detail.chatSummaryText", "Messages across all recorded sessions.")}
              </p>
            </section>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-card-foreground">
              {label("detail.sessionsTitle", "Session Timeline")}
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {detail.sessions.length > 0 ? (
              detail.sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-card-foreground">
                        {dateTimeFormatter.format(new Date(session.scheduledStart))}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {timeFormatter.format(new Date(session.scheduledStart))} -{" "}
                        {timeFormatter.format(new Date(session.scheduledEnd))}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${sessionStatusClass(session.status)}`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {label("detail.sessionAttendees", "Attendance rows")}
                      </p>
                      <p className="mt-1 font-semibold text-card-foreground">
                        {numberFormatter.format(session.attendeeCount)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {label("detail.sessionMessages", "Chat messages")}
                      </p>
                      <p className="mt-1 font-semibold text-card-foreground">
                        {numberFormatter.format(session.chatMessageCount)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {label("detail.sessionRecording", "Recording")}
                      </p>
                      <p className="mt-1 font-semibold text-card-foreground">
                        {session.recordingUrl ? label("detail.available", "Available") : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {label("detail.noSessions", "No sessions scheduled for this class yet.")}
              </p>
            )}
          </div>
        </section>

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
                  <th className="px-4 py-3">{label("detail.table.student", "Student")}</th>
                  <th className="px-4 py-3">{label("detail.table.session", "Session")}</th>
                  <th className="px-4 py-3">{label("detail.table.status", "Status")}</th>
                  <th className="px-4 py-3">{label("detail.table.joinTime", "Join Time")}</th>
                  <th className="px-4 py-3">{label("detail.table.duration", "Duration")}</th>
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
                        {dateTimeFormatter.format(new Date(row.sessionScheduledStart))}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${attendanceStatusClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.joinTime ? dateTimeFormatter.format(new Date(row.joinTime)) : "-"}
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
                      {label("detail.noAttendance", "No attendance records found for this class.")}
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
