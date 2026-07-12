"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, Save, Video, X } from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  MeetingTypeValue,
  RecurrencePatternValue,
} from "@/lib/admin-class-types";
import type {
  InstructorClassEditPayload,
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

export default function EditClassModal({
  classId,
  open,
  onClose,
  onSaved,
}: {
  classId: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("instructorClassesPage.edit");
  const tAdmin = useTranslations("adminClassesPage");
  const [courses, setCourses] = useState<InstructorCourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEditSchedule, setCanEditSchedule] = useState(true);
  const [draft, setDraft] = useState<InstructorCreateClassPayload | null>(null);

  useEffect(() => {
    if (!open || !classId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [coursesRes, classRes] = await Promise.all([
          fetch("/api/instructor/courses"),
          fetch(`/api/instructor/classes/${classId}`),
        ]);
        const coursesData = await parseApiJson<{ courses?: InstructorCourseOption[] }>(
          coursesRes,
        );
        const classData = await parseApiJson<{ class?: InstructorClassEditPayload }>(classRes);
        if (!coursesRes.ok) {
          throw new Error(
            "error" in coursesData && coursesData.error
              ? String(coursesData.error)
              : "Failed to load courses",
          );
        }
        if (!classRes.ok || !classData.class) {
          throw new Error(
            "error" in classData && classData.error
              ? String(classData.error)
              : "Failed to load class",
          );
        }
        if (cancelled) return;
        setCourses(coursesData.courses ?? []);
        setCanEditSchedule(classData.class.canEditSchedule);
        setDraft({
          title: classData.class.title,
          courseId: classData.class.courseId,
          subjectName: classData.class.subjectName,
          batchName: classData.class.batchName,
          meetingType: classData.class.meetingType,
          recurrence: classData.class.recurrence,
          durationMinutes: classData.class.durationMinutes,
          meetingLink: classData.class.meetingLink,
          waitingRoomEnabled: classData.class.waitingRoomEnabled,
          recordingEnabled: classData.class.recordingEnabled,
          autoAttendanceEnabled: classData.class.autoAttendanceEnabled,
          scheduledStart: classData.class.scheduledStart,
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load class");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classId, open]);

  const canSave = useMemo(
    () =>
      Boolean(
        draft?.title.trim() &&
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
    setDraft((current) =>
      current
        ? {
            ...current,
            courseId,
            subjectName: course?.title ?? current.subjectName,
          }
        : current,
    );
  }

  async function handleSave() {
    if (!draft || !classId || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/instructor/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to update class");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update class");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !classId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {t("eyebrow")}
            </p>
            <h2 className="text-xl font-bold text-card-foreground">{t("title")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("close")} className="rounded-lg border border-border p-2 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading || !draft ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {!canEditSchedule && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                {t("scheduleLocked")}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.classTitle")}
                </span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((c) => (c ? { ...c, title: e.target.value } : c))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {tAdmin("editor.fields.batch")}
                </span>
                <input
                  value={draft.batchName}
                  onChange={(e) => setDraft((c) => (c ? { ...c, batchName: e.target.value } : c))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                />
              </label>
            </div>
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
                {t("scheduledStart")}
              </span>
              <input
                type="datetime-local"
                disabled={!canEditSchedule}
                value={toDateTimeLocalValue(draft.scheduledStart)}
                onChange={(e) =>
                  setDraft((c) =>
                    c
                      ? {
                          ...c,
                          scheduledStart: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : "",
                        }
                      : c,
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-60"
              />
            </label>
            <div className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 font-semibold text-card-foreground">
                <Video className="h-4 w-4 text-primary" />
                {tAdmin("editor.meetingSettings")}
              </h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.waitingRoomEnabled}
                    onChange={(e) =>
                      setDraft((c) =>
                        c ? { ...c, waitingRoomEnabled: e.target.checked } : c,
                      )
                    }
                  />
                  {tAdmin("editor.fields.waitingRoom")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.recordingEnabled}
                    onChange={(e) =>
                      setDraft((c) =>
                        c ? { ...c, recordingEnabled: e.target.checked } : c,
                      )
                    }
                  />
                  {tAdmin("editor.fields.recording")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.autoAttendanceEnabled}
                    onChange={(e) =>
                      setDraft((c) =>
                        c ? { ...c, autoAttendanceEnabled: e.target.checked } : c,
                      )
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
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !canSave || !draft}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
