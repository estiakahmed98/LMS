"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, LoaderCircle, PlayCircle, Search, Share2, Check } from "lucide-react";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";
import { parseApiJson } from "@/lib/parse-api-json";
import type { AdminRecordingFacets, AdminRecordingSummary } from "@/lib/admin-recording-types";

const PAGE_SIZE = 9;

type DateFilterValue = "all" | "today" | "yesterday" | "tomorrow" | "last7" | "next7" | "custom";

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
      if (!customStart && !customEnd) return null;
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
  if (!mb) return "—";
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

export default function InstructorRecordingsPage() {
  const t = useTranslations("instructorRecordingsPage");

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [recordings, setRecordings] = useState<AdminRecordingSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<AdminRecordingFacets>({
    batchNames: [],
    subjectNames: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [batchName, setBatchName] = useState<"all" | string>("all");
  const [subjectName, setSubjectName] = useState<"all" | string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);

  const [playing, setPlaying] = useState<AdminRecordingSummary | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  }, [query, batchName, subjectName, dateFilter, customStart, customEnd]);

  const loadRecordings = useCallback(
    async (opts: { includeFacets?: boolean } = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (query) params.set("search", query);
        if (batchName !== "all") params.set("batchName", batchName);
        if (subjectName !== "all") params.set("subjectName", subjectName);
        if (dateRange) {
          params.set("dateFrom", dateRange.start.toISOString());
          params.set("dateTo", dateRange.end.toISOString());
        }
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        if (opts.includeFacets) params.set("includeFacets", "true");

        const res = await fetch(`/api/instructor/recordings?${params.toString()}`);
        const data = await parseApiJson<{
          recordings?: AdminRecordingSummary[];
          total?: number;
          facets?: AdminRecordingFacets;
          error?: string;
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Failed to load recordings");
        setRecordings(data.recordings ?? []);
        setTotal(data.total ?? 0);
        if (data.facets) setFacets(data.facets);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recordings");
      } finally {
        setLoading(false);
      }
    },
    [query, batchName, subjectName, dateRange, page],
  );

  const isFirstLoad = useRef(true);
  useEffect(() => {
    const includeFacets = isFirstLoad.current;
    isFirstLoad.current = false;
    loadRecordings({ includeFacets });
  }, [loadRecordings]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function handleShare(id: string, url: string) {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="grid gap-4 xl:grid-cols-16">
          <label className="relative xl:col-span-8">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder={t("searchPlaceholder")}
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
            {facets.subjectNames.map((name) => (
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
            {facets.batchNames.map((name) => (
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
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </section>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : recordings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="flex flex-col rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div>
                <h3 className="font-semibold text-card-foreground">{recording.classTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {recording.batchName} · {recording.subjectName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(recording.scheduledStart).toLocaleString()} ·{" "}
                {formatSize(recording.recordingSizeMb)} ·{" "}
                {t("attendees", { count: recording.attendeeCount })}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setPlaying(recording)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                >
                  <PlayCircle className="h-3.5 w-3.5" />
                  {t("play")}
                </button>
                {!recording.youtubeVideoId && (
                  <a
                    href={recording.recordingUrl}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold hover:bg-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleShare(recording.id, recording.recordingUrl)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold hover:bg-muted"
                >
                  {copiedId === recording.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} recordings
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {playing && (
        <RecordingPlayerModal
          title={playing.classTitle}
          src={playing.recordingUrl}
          videoId={playing.id}
          userId=""
          youtubeVideoId={playing.youtubeVideoId}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
