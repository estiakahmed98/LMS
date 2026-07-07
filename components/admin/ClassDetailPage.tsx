"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useHasMounted } from "@/lib/use-has-mounted";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Download,
  MessageSquareText,
  Save,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import {
  getAttendanceBySessionId,
  getChatMessagesBySessionId,
  getInstructors,
  getLiveClassById,
  getSessionsByLiveClassId,
  getUserById,
  mockCourses,
  type AttendanceStatus,
  type LiveClass,
  type LiveClassStatus,
  type MeetingType,
  type RecurrencePattern,
  type SessionStatus,
} from "@/lib/mock-data";

const statuses: LiveClassStatus[] = ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"];
const meetingTypes: MeetingType[] = ["VIDEO_CONFERENCE", "WEBINAR", "AUDIO_ONLY"];
const recurrences: RecurrencePattern[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

function liveClassStatusClass(status: LiveClassStatus) {
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

function attendanceStatusClass(status: AttendanceStatus) {
  switch (status) {
    case "PRESENT":
      return "border-green-200 bg-green-50 text-green-700";
    case "LATE":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "ABSENT":
      return "border-red-200 bg-red-50 text-red-700";
  }
}

export default function ClassDetailPage({ classId }: { classId: string }) {
  const t = useTranslations("adminClassesPage");
  const tAdmin = useTranslations("admin");
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
  const instructors = getInstructors();
  const hasMounted = useHasMounted();
  const initialClass = getLiveClassById(classId);
  const [draft, setDraft] = useState<LiveClass | null>(
    initialClass ? { ...initialClass } : null,
  );
  const [notice, setNotice] = useState("Class detail loaded.");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  // Mock session/class dates are computed from Date.now() at module load, so
  // formatting them before the client mounts would mismatch the server render.
  function formatDateTime(date: Date) {
    return hasMounted ? dateTimeFormatter.format(date) : "";
  }

  function formatTime(date: Date) {
    return hasMounted ? timeFormatter.format(date) : "";
  }

  const sessions = useMemo(
    () => (draft ? getSessionsByLiveClassId(draft.id) : []),
    [draft],
  );

  const attendanceRows = useMemo(
    () =>
      sessions.flatMap((session) =>
        getAttendanceBySessionId(session.id).map((attendance) => ({
          attendance,
          session,
          user: getUserById(attendance.userId),
        })),
      ),
    [sessions],
  );

  const chatCount = useMemo(
    () =>
      sessions.reduce(
        (total, session) => total + getChatMessagesBySessionId(session.id).length,
        0,
      ),
    [sessions],
  );

  const stats = useMemo(() => {
    const recordingCount = sessions.filter((session) => session.recordingUrl).length;
    const presentCount = attendanceRows.filter(
      (row) => row.attendance.status === "PRESENT" || row.attendance.status === "LATE",
    ).length;
    const attendanceRate =
      attendanceRows.length > 0 ? Math.round((presentCount / attendanceRows.length) * 100) : 0;
    return {
      sessions: sessions.length,
      recordings: recordingCount,
      attendees: attendanceRows.length,
      attendanceRate,
    };
  }, [attendanceRows, sessions]);

  if (!draft) {
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

  function handleCourseChange(nextCourseId: string) {
    const course = mockCourses.find((item) => item.id === nextCourseId);
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

  function handleSave() {
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
    setNotice(label("notice.saved", "Class saved."));
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
              {getUserById(draft.instructorId)?.name} | {draft.batchName}
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
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Save className="h-4 w-4" />
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
              {numberFormatter.format(stats.sessions)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.recordings", "Recordings")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.recordings)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.participants", "Attendance rows")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.attendees)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label("card.attendance", "Attendance")}</p>
            <p className="mt-2 text-3xl font-bold text-card-foreground">
              {numberFormatter.format(stats.attendanceRate)}%
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
                  date: formatDateTime(draft.createdAt),
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
                  {mockCourses.map((course) => (
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
                        ? { ...current, status: event.target.value as LiveClassStatus }
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
                        ? { ...current, meetingType: event.target.value as MeetingType }
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
                        ? { ...current, recurrence: event.target.value as RecurrencePattern }
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
                {sessions.filter((session) => session.recordingUrl).length > 0 ? (
                  sessions
                    .filter((session) => session.recordingUrl)
                    .map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                      >
                        <div>
                          <p className="font-medium text-card-foreground">
                            {formatDateTime(session.scheduledStart)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {label(
                              "detail.recordingSize",
                              "Size: {size} MB",
                              {
                                size: session.recordingSizeMb
                                  ? numberFormatter.format(session.recordingSizeMb)
                                  : "0",
                              },
                            )}
                          </p>
                        </div>
                        <a
                          href={session.recordingUrl}
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
                {numberFormatter.format(chatCount)}
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
            {sessions.length > 0 ? (
              sessions.map((session) => {
                const attendees = getAttendanceBySessionId(session.id);
                const messages = getChatMessagesBySessionId(session.id);
                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-card-foreground">
                          {formatDateTime(session.scheduledStart)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatTime(session.scheduledStart)} -{" "}
                          {formatTime(session.scheduledEnd)}
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
                          {numberFormatter.format(attendees.length)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
                        <p className="text-xs text-muted-foreground">
                          {label("detail.sessionMessages", "Chat messages")}
                        </p>
                        <p className="mt-1 font-semibold text-card-foreground">
                          {numberFormatter.format(messages.length)}
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
                );
              })
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
                {attendanceRows.length > 0 ? (
                  attendanceRows.map((row) => (
                    <tr key={row.attendance.id}>
                      <td className="px-4 py-3 font-medium text-card-foreground">
                        {row.user?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {dateTimeFormatter.format(row.session.scheduledStart)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs font-semibold ${attendanceStatusClass(row.attendance.status)}`}
                        >
                          {row.attendance.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.attendance.joinTime
                          ? dateTimeFormatter.format(row.attendance.joinTime)
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.attendance.durationMinutes
                          ? `${numberFormatter.format(row.attendance.durationMinutes)} min`
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
              `"${draft.title}" will be removed from the mock class list.`,
              { title: draft.title },
            )}
            confirmLabel={label("confirm.deleteConfirm", "Delete")}
            cancelLabel={label("confirm.cancel", "Cancel")}
            danger
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              setDeleteOpen(false);
              setNotice(label("notice.deleted", "Class deleted."));
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
