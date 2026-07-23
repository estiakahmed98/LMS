"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import StudentConfirmModal from "@/components/admin/StudentConfirmModal";
import { useLocale, useTranslations } from "next-intl";
import {
  Check,
  Download,
  LoaderCircle,
  PlayCircle,
  Plus,
  Save,
  Search,
  Share2,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";
import type {
  AdminRecordingPayload,
  AdminRecordingSummary,
} from "@/lib/admin-recording-types";
import type { AdminClassSummary } from "@/lib/admin-class-types";
import { getYouTubeThumbnailUrl, parseYouTubeUrl } from "@/lib/youtube";
import YouTubePlayer from "@/components/shared/YouTubePlayer";

const PAGE_SIZE = 9;

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

const dateFilterLabels: Record<DateFilterValue, string> = {
  all: "All Dates",
  today: "Today",
  yesterday: "Yesterday",
  tomorrow: "Tomorrow",
  last7: "Last 7 Days",
  next7: "Next 7 Days",
  custom: "Custom Range",
};

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
      const start = customStart ? startOfDay(new Date(customStart)) : new Date(0);
      const end = customEnd
        ? addDays(startOfDay(new Date(customEnd)), 1)
        : new Date(8640000000000000);
      return { start, end };
    }
    default:
      return null;
  }
}

function formatSize(mb: number | null) {
  if (!mb) return "-";
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

function toDateTimeLocal(iso: string) {
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function buildEmptyDraft(fallbackClassId: string): AdminRecordingPayload {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60000);
  return {
    liveClassId: fallbackClassId,
    scheduledStart: start.toISOString(),
    scheduledEnd: now.toISOString(),
    recordingUrl: "",
    recordingSizeMb: null,
    youtubeUrl: null,
    youtubeVideoId: null,
  };
}

export default function RecordingsPage() {
  const t = useTranslations("adminRecordingsPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [recordings, setRecordings] = useState<AdminRecordingSummary[]>([]);
  const [classes, setClasses] = useState<AdminClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [batchName, setBatchName] = useState<"all" | string>("all");
  const [subjectName, setSubjectName] = useState<"all" | string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);

  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminRecordingPayload>(buildEmptyDraft(""));
  const [deleteTarget, setDeleteTarget] = useState<AdminRecordingSummary | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewRecording, setViewRecording] = useState<AdminRecordingSummary | null>(null);

  const previewVideoId = useMemo(
    () => parseYouTubeUrl(draft.recordingUrl),
    [draft.recordingUrl],
  );
  const showYoutubeError =
    draft.recordingUrl.trim().length > 0 &&
    /youtu\.?be/i.test(draft.recordingUrl) &&
    !previewVideoId;

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [recordingsRes, classesRes] = await Promise.all([
        fetch("/api/admin/recordings"),
        fetch("/api/admin/classes"),
      ]);

      if (!recordingsRes.ok || !classesRes.ok) {
        throw new Error("Failed to load recordings data.");
      }

      const recordingsData = await recordingsRes.json();
      const classesData = await classesRes.json();

      setRecordings(recordingsData.recordings ?? []);
      setClasses(classesData.classes ?? []);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load recordings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const batchNames = useMemo(
    () => Array.from(new Set(recordings.map((r) => r.batchName))).sort(),
    [recordings],
  );
  const subjectNames = useMemo(
    () => Array.from(new Set(recordings.map((r) => r.subjectName))).sort(),
    [recordings],
  );

  const dateRange = useMemo(
    () => resolveDateRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd],
  );

  const filteredRecordings = useMemo(
    () =>
      recordings.filter((recording) => {
        const normalizedQuery = query.toLowerCase();
        const matchesQuery =
          recording.classTitle.toLowerCase().includes(normalizedQuery) ||
          recording.subjectName.toLowerCase().includes(normalizedQuery) ||
          recording.batchName.toLowerCase().includes(normalizedQuery) ||
          (recording.instructor?.name.toLowerCase().includes(normalizedQuery) ?? false);
        const matchesBatch = batchName === "all" || recording.batchName === batchName;
        const matchesSubject =
          subjectName === "all" || recording.subjectName === subjectName;
        const matchesDate = (() => {
          if (!dateRange) {
            return true;
          }
          const time = new Date(recording.scheduledStart).getTime();
          return time >= dateRange.start.getTime() && time < dateRange.end.getTime();
        })();
        return matchesQuery && matchesBatch && matchesSubject && matchesDate;
      }),
    [recordings, query, batchName, subjectName, dateRange],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRecordings.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, batchName, subjectName, dateFilter, customStart, customEnd]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRecordings = useMemo(
    () => filteredRecordings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRecordings, page],
  );

  function openNewRecording() {
    setEditingId(null);
    setDraft(buildEmptyDraft(classes[0]?.id ?? ""));
    setNotice(label("notice.newDraftReady", "New recording draft ready."));
    setIsEditorOpen(true);
  }

  function openEditRecording(recording: AdminRecordingSummary) {
    setEditingId(recording.id);
    setDraft({
      liveClassId: recording.liveClassId,
      scheduledStart: recording.scheduledStart,
      scheduledEnd: recording.scheduledEnd,
      recordingUrl: recording.recordingUrl,
      recordingSizeMb: recording.recordingSizeMb,
      youtubeUrl: recording.youtubeUrl,
      youtubeVideoId: recording.youtubeVideoId,
    });
    setNotice(label("notice.editing", "Editing recording."));
    setIsEditorOpen(true);
  }

  function handleRecordingUrlChange(value: string) {
    const videoId = parseYouTubeUrl(value);
    setDraft((current) => ({
      ...current,
      recordingUrl: value,
      youtubeUrl: videoId ? value.trim() : null,
      youtubeVideoId: videoId,
    }));
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "recordings");
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to upload recording file.");
      }
      const data = await response.json();
      setDraft((current) => ({
        ...current,
        recordingUrl: data.url,
        recordingSizeMb: Math.round((data.size / (1024 * 1024)) * 10) / 10,
        youtubeUrl: null,
        youtubeVideoId: null,
      }));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveRecording() {
    if (!draft.liveClassId) {
      setNotice(label("notice.classRequired", "Please select a class."));
      return;
    }
    if (!draft.recordingUrl.trim()) {
      setNotice(label("notice.urlRequired", "Recording URL or file is required."));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/admin/recordings/${editingId}` : "/api/admin/recordings",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save recording.");
      }

      await loadData();
      setIsEditorOpen(false);
      setNotice(label("notice.saved", "Recording saved."));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save recording.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecording() {
    if (!deleteTarget) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/recordings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete recording.");
      }
      setDeleteTarget(null);
      await loadData();
      setNotice(label("notice.deleted", "Recording deleted."));
    } catch (error) {
      setDeleteTarget(null);
      setNotice(error instanceof Error ? error.message : "Failed to delete recording.");
    }
  }

  function handleShare(id: string, url: string) {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <AdminLayout title={tAdmin("recordings")}>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {tAdmin("recordings")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {label(
                "subtitle",
                "Browse, upload, edit, and manage recorded live classes.",
              )}
            </p>
          </div>
          <button
            onClick={openNewRecording}
            disabled={loading || classes.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {label("actions.newRecording", "New Recording")}
          </button>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 xl:grid-cols-16">
            <label className="relative xl:col-span-8">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={label(
                  "filters.searchPlaceholder",
                  "Search by class, batch, subject, or instructor...",
                )}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilterValue)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
            >
              {dateFilters.map((item) => (
                <option key={item} value={item}>
                  {label(`filters.date.${item}`, dateFilterLabels[item])}
                </option>
              ))}
            </select>
            <select
              value={subjectName}
              onChange={(event) => setSubjectName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-3"
            >
              <option value="all">{label("filters.allSubjects", "All Subjects")}</option>
              {subjectNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-3"
            >
              <option value="all">{label("filters.allBatches", "All Batches")}</option>
              {batchNames.map((name) => (
                <option key={name} value={name}>
                  {name}
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
          <p className="mt-4 text-sm text-muted-foreground">{loadError ?? notice}</p>
        </section>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            {label("loading", "Loading recordings…")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedRecordings.map((recording) => (
              <article
                key={recording.id}
                className="flex flex-col rounded-xl border border-border bg-card p-5"
              >
                {recording.youtubeVideoId && (
                  <button
                    type="button"
                    onClick={() => setViewRecording(recording)}
                    className="group relative mb-4 block aspect-video w-full overflow-hidden rounded-lg bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getYouTubeThumbnailUrl(recording.youtubeVideoId)}
                      alt={recording.classTitle}
                      className="h-full w-full object-cover transition group-hover:opacity-80"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:bg-black/80">
                        <PlayCircle className="h-6 w-6" />
                      </span>
                    </span>
                    <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Video className="h-3 w-3" />
                      YouTube
                    </span>
                  </button>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {recording.subjectName}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-card-foreground">
                    {recording.classTitle}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recording.instructor?.name} | {recording.batchName}
                  </p>
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <p>{dateTimeFormatter.format(new Date(recording.scheduledStart))}</p>
                  <p>
                    {label("fileSize", "File size")}: {formatSize(recording.recordingSizeMb)}
                  </p>
                  <p>
                    {label("attendees", "Attendees")}:{" "}
                    {numberFormatter.format(recording.attendeeCount)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {recording.youtubeVideoId ? (
                    <button
                      onClick={() => setViewRecording(recording)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {label("play", "Play")}
                    </button>
                  ) : (
                    <a
                      href={recording.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {label("play", "Play")}
                    </a>
                  )}
                  {!recording.youtubeVideoId && (
                    <>
                      <a
                        href={recording.recordingUrl}
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {label("download", "Download")}
                      </a>
                      <button
                        onClick={() => handleShare(recording.id, recording.recordingUrl)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        {copiedId === recording.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Share2 className="h-3.5 w-3.5" />
                        )}
                        {label("share", "Share")}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openEditRecording(recording)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    {label("actions.edit", "Edit")}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(recording)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-muted"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {label("actions.delete", "Delete")}
                  </button>
                </div>
              </article>
            ))}

            {paginatedRecordings.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {label("empty", "No recordings available yet.")}
              </div>
            )}
          </div>
        )}

        {filteredRecordings.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {label(
                "pagination.summary",
                `Page ${numberFormatter.format(page)} of ${numberFormatter.format(
                  totalPages,
                )} | ${numberFormatter.format(filteredRecordings.length)} recordings`,
                {
                  page: numberFormatter.format(page),
                  totalPages: numberFormatter.format(totalPages),
                  total: numberFormatter.format(filteredRecordings.length),
                },
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label("pagination.previous", "Previous")}
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label("pagination.next", "Next")}
              </button>
            </div>
          </div>
        )}

        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-card-foreground">
                  {editingId
                    ? label("editor.editTitle", "Edit Recording")
                    : label("editor.newTitle", "New Recording")}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveRecording}
                    disabled={saving || uploading}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    {saving ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {label("editor.save", "Save")}
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

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                    {label("editor.fields.class", "Class")}
                  </label>
                  <select
                    value={draft.liveClassId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        liveClassId: event.target.value,
                      }))
                    }
                    className="w-full truncate rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  >
                    {classes.map((liveClass) => (
                      <option key={liveClass.id} value={liveClass.id}>
                        {liveClass.title} ({liveClass.batchName})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {classes.find((liveClass) => liveClass.id === draft.liveClassId)
                      ?.subjectName ?? ""}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {label("editor.fields.start", "Session start")}
                    </label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocal(draft.scheduledStart)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          scheduledStart: new Date(event.target.value).toISOString(),
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                      {label("editor.fields.end", "Session end")}
                    </label>
                    <input
                      type="datetime-local"
                      value={toDateTimeLocal(draft.scheduledEnd)}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          scheduledEnd: new Date(event.target.value).toISOString(),
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                    {label("editor.fields.url", "Recording URL")}
                  </label>
                  <input
                    value={draft.recordingUrl}
                    onChange={(event) => handleRecordingUrlChange(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {label(
                      "editor.fields.urlHint",
                      "Paste a direct file link, or an Unlisted YouTube URL to embed it as the recording player.",
                    )}
                  </p>
                  {showYoutubeError && (
                    <p className="mt-1.5 text-xs font-medium text-destructive">
                      {label(
                        "editor.fields.youtubeInvalid",
                        "Please enter a valid YouTube video URL.",
                      )}
                    </p>
                  )}
                  <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">
                    {uploading ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    {label("editor.fields.upload", "Upload a file instead")}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          handleFileUpload(file);
                        }
                      }}
                    />
                  </label>

                  {previewVideoId && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                        {label("editor.fields.youtubePreview", "Live Preview")}
                      </p>
                      <YouTubePlayer videoId={previewVideoId} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">
                    {label("editor.fields.size", "File size (MB)")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draft.recordingSizeMb ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        recordingSizeMb:
                          event.target.value === "" ? null : Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewRecording && viewRecording.youtubeVideoId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setViewRecording(null)}
          >
            <div
              className="w-full max-w-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="truncate pr-4 text-sm font-semibold text-white">
                  {viewRecording.classTitle}
                </h2>
                <button
                  onClick={() => setViewRecording(null)}
                  aria-label={label("editor.close", "Close")}
                  className="shrink-0 rounded-lg p-1.5 text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <YouTubePlayer videoId={viewRecording.youtubeVideoId} />
            </div>
          </div>
        )}

        {deleteTarget && (
          <StudentConfirmModal
            title={label("confirm.deleteTitle", "Delete recording?")}
            description={label(
              "confirm.deleteDescription",
              `"${deleteTarget.classTitle}" recording will be permanently deleted.`,
              { title: deleteTarget.classTitle },
            )}
            confirmLabel={label("confirm.deleteConfirm", "Delete")}
            cancelLabel={label("confirm.cancel", "Cancel")}
            danger
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDeleteRecording}
          />
        )}
      </div>
    </AdminLayout>
  );
}
