"use client";

import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useTranslations } from "next-intl";
import { Plus, Save, Trash2, Video } from "lucide-react";
import {
  mockLiveClasses,
  mockCourses,
  getInstructors,
  getUserById,
  getSessionsByLiveClassId,
  type LiveClass,
  type LiveClassStatus,
  type MeetingType,
  type RecurrencePattern,
} from "@/lib/mock-data";

const statuses: LiveClassStatus[] = ["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"];
const meetingTypes: MeetingType[] = ["VIDEO_CONFERENCE", "WEBINAR", "AUDIO_ONLY"];
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

export default function ClassManagementCrudPage() {
  const t = useTranslations("adminClassesPage");
  const tAdmin = useTranslations("admin");
  const instructors = getInstructors();

  const [classes, setClasses] = useState<LiveClass[]>(mockLiveClasses);
  const [selectedId, setSelectedId] = useState(mockLiveClasses[0]?.id ?? "");
  const [draft, setDraft] = useState<LiveClass>(mockLiveClasses[0]);
  const [notice, setNotice] = useState(t("notice.ready"));

  function selectClass(liveClass: LiveClass) {
    setSelectedId(liveClass.id);
    setDraft({ ...liveClass });
    setNotice(t("notice.editing", { title: liveClass.title }));
  }

  function saveClass() {
    if (!draft.title.trim()) {
      setNotice(t("notice.titleRequired"));
      return;
    }
    setClasses((current) => {
      const exists = current.some((c) => c.id === selectedId);
      return exists
        ? current.map((c) => (c.id === selectedId ? draft : c))
        : [draft, ...current];
    });
    setSelectedId(draft.id);
    setNotice(t("notice.saved"));
  }

  function newClass() {
    const id = `live_new_${classes.length + 1}`;
    const next: LiveClass = {
      id,
      title: t("newClass.title"),
      courseId: mockCourses[0]?.id ?? "",
      subjectName: mockCourses[0]?.title ?? "",
      instructorId: instructors[0]?.id ?? "",
      batchName: t("newClass.batchName"),
      status: "SCHEDULED",
      meetingType: "VIDEO_CONFERENCE",
      recurrence: "NONE",
      durationMinutes: 60,
      meetingLink: `https://meet.pstc.edu/${id}`,
      waitingRoomEnabled: true,
      recordingEnabled: true,
      autoAttendanceEnabled: true,
      createdAt: new Date(),
    };
    setDraft(next);
    setSelectedId(next.id);
    setNotice(t("notice.newDraftReady"));
  }

  function deleteClass(id: string) {
    const next = classes.filter((c) => c.id !== id);
    setClasses(next);
    if (next[0]) selectClass(next[0]);
    setNotice(t("notice.deleted"));
  }

  return (
    <AdminLayout title={tAdmin("classManagement")}>
      <div className="grid gap-6 p-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-card-foreground">
              {tAdmin("classManagement")}
            </h1>
            <button
              onClick={newClass}
              className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {t("actions.newClass")}
            </button>
          </div>

          <div className="space-y-3">
            {classes.map((liveClass) => {
              const instructor = getUserById(liveClass.instructorId);
              const sessionCount = getSessionsByLiveClassId(liveClass.id).length;
              return (
                <div
                  key={liveClass.id}
                  className={`rounded-lg border p-4 ${
                    selectedId === liveClass.id ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <button onClick={() => selectClass(liveClass)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-card-foreground">{liveClass.title}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {instructor?.name} · {liveClass.batchName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("classCard.sessionCount", { count: sessionCount })}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${statusClass(liveClass.status)}`}
                      >
                        {t(`status.${liveClass.status}`)}
                      </span>
                    </div>
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => selectClass(liveClass)}
                      className="rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
                    >
                      {t("actions.edit")}
                    </button>
                    <button
                      onClick={() => deleteClass(liveClass.id)}
                      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-destructive hover:bg-muted"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("actions.delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {t("editor.eyebrow")}
              </p>
              <h2 className="text-2xl font-bold text-card-foreground">{draft?.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{notice}</p>
            </div>
            <div className="flex gap-2">
              <select
                value={draft?.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as LiveClassStatus })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {t(`status.${status}`)}
                  </option>
                ))}
              </select>
              <button
                onClick={saveClass}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Save className="h-4 w-4" />
                {t("editor.save")}
              </button>
            </div>
          </div>

          {draft && (
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder={t("editor.fields.classTitle")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
                <input
                  value={draft.batchName}
                  onChange={(e) => setDraft({ ...draft, batchName: e.target.value })}
                  placeholder={t("editor.fields.batch")}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("editor.fields.subject")}
                  </label>
                  <select
                    value={draft.courseId}
                    onChange={(e) => {
                      const course = mockCourses.find((c) => c.id === e.target.value);
                      setDraft({
                        ...draft,
                        courseId: e.target.value,
                        subjectName: course?.title ?? draft.subjectName,
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {mockCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("editor.fields.instructor")}
                  </label>
                  <select
                    value={draft.instructorId}
                    onChange={(e) => setDraft({ ...draft, instructorId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {instructors.map((instructor) => (
                      <option key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4">
                <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  {t("editor.meetingSettings")}
                </h3>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.meetingType")}
                    </label>
                    <select
                      value={draft.meetingType}
                      onChange={(e) => setDraft({ ...draft, meetingType: e.target.value as MeetingType })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      {meetingTypes.map((type) => (
                        <option key={type} value={type}>
                          {t(`meetingType.${type}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.recurrence")}
                    </label>
                    <select
                      value={draft.recurrence}
                      onChange={(e) => setDraft({ ...draft, recurrence: e.target.value as RecurrencePattern })}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    >
                      {recurrences.map((pattern) => (
                        <option key={pattern} value={pattern}>
                          {t(`recurrence.${pattern}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("editor.fields.duration")}
                    </label>
                    <input
                      type="number"
                      min={5}
                      value={draft.durationMinutes}
                      onChange={(e) =>
                        setDraft({ ...draft, durationMinutes: Number(e.target.value) || 0 })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("editor.fields.meetingLink")}
                  </label>
                  <input
                    value={draft.meetingLink}
                    onChange={(e) => setDraft({ ...draft, meetingLink: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                    {t("editor.fields.waitingRoom")}
                    <input
                      type="checkbox"
                      checked={draft.waitingRoomEnabled}
                      onChange={(e) => setDraft({ ...draft, waitingRoomEnabled: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                    {t("editor.fields.recording")}
                    <input
                      type="checkbox"
                      checked={draft.recordingEnabled}
                      onChange={(e) => setDraft({ ...draft, recordingEnabled: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm font-medium">
                    {t("editor.fields.autoAttendance")}
                    <input
                      type="checkbox"
                      checked={draft.autoAttendanceEnabled}
                      onChange={(e) => setDraft({ ...draft, autoAttendanceEnabled: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
