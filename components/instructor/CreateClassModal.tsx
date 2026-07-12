"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Plus, Save, Video, X } from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  MeetingTypeValue,
  RecurrencePatternValue,
} from "@/lib/admin-class-types";
import type {
  InstructorCourseOption,
  InstructorCreateClassPayload,
} from "@/lib/instructor-class-types";

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

function toDateTimeLocalValue(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildDraft(courses: InstructorCourseOption[]): InstructorCreateClassPayload {
  const course = courses[0];
  return {
    title: "",
    courseId: course?.id ?? "",
    subjectName: course?.title ?? "",
    batchName: "",
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

export default function CreateClassModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("instructorClassesPage.create");
  const tAdmin = useTranslations("adminClassesPage");
  const [courses, setCourses] = useState<InstructorCourseOption[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<InstructorCreateClassPayload>(buildDraft([]));

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingCourses(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/instructor/courses");
        const data = await parseApiJson<{ courses?: InstructorCourseOption[]; error?: string }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load courses");
        }
        const nextCourses = data.courses ?? [];
        if (!cancelled) {
          setCourses(nextCourses);
          setDraft(buildDraft(nextCourses));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load courses");
        }
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const canSave = useMemo(
    () =>
      Boolean(
        draft.title.trim() &&
          draft.courseId &&
          draft.batchName.trim() &&
          draft.meetingLink.trim() &&
          draft.scheduledStart &&
          draft.durationMinutes >= 5,
      ),
    [draft],
  );

  function handleCourseChange(courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    setDraft((current) => ({
      ...current,
      courseId,
      subjectName: course?.title ?? current.subjectName,
      meetingLink: course ? `https://meet.pstc.edu/${course.id}` : current.meetingLink,
    }));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/instructor/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create class");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create class");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {t("eyebrow")}
            </p>
            <h2 className="text-xl font-bold text-card-foreground">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-lg border border-border p-2 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingCourses ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {t("loadingCourses")}
          </div>
        ) : courses.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("noCourses")}
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.classTitle")}
                </span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.batch")}
                </span>
                <input
                  value={draft.batchName}
                  onChange={(e) => setDraft((c) => ({ ...c, batchName: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.subject")}
                </span>
                <select
                  value={draft.courseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.duration")}
                </span>
                <input
                  type="number"
                  min={5}
                  value={draft.durationMinutes}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      durationMinutes: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm space-y-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {t("scheduledStart")}
              </span>
              <input
                type="datetime-local"
                value={toDateTimeLocalValue(draft.scheduledStart)}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    scheduledStart: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  }))
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
            </label>

            <div className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
                <Video className="h-4 w-4 text-primary" />
                {tAdmin("editor.meetingSettings")}
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block text-sm space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {tAdmin("editor.fields.meetingType")}
                  </span>
                  <select
                    value={draft.meetingType}
                    onChange={(e) =>
                      setDraft((c) => ({
                        ...c,
                        meetingType: e.target.value as MeetingTypeValue,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {meetingTypes.map((item) => (
                      <option key={item} value={item}>
                        {tAdmin(`meetingType.${item}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {tAdmin("editor.fields.recurrence")}
                  </span>
                  <select
                    value={draft.recurrence}
                    onChange={(e) =>
                      setDraft((c) => ({
                        ...c,
                        recurrence: e.target.value as RecurrencePatternValue,
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {recurrences.map((item) => (
                      <option key={item} value={item}>
                        {tAdmin(`recurrence.${item}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mt-4 block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.meetingLink")}
                </span>
                <input
                  value={draft.meetingLink}
                  onChange={(e) => setDraft((c) => ({ ...c, meetingLink: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.waitingRoomEnabled}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, waitingRoomEnabled: e.target.checked }))
                    }
                  />
                  {tAdmin("editor.fields.waitingRoom")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.recordingEnabled}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, recordingEnabled: e.target.checked }))
                    }
                  />
                  {tAdmin("editor.fields.recording")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.autoAttendanceEnabled}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, autoAttendanceEnabled: e.target.checked }))
                    }
                  />
                  {tAdmin("editor.fields.autoAttendance")}
                </label>
              </div>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canSave || courses.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
