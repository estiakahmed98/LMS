"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LoaderCircle, PlayCircle, Search } from "lucide-react";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";
import { parseApiJson } from "@/lib/parse-api-json";
import type { AdminRecordingSummary } from "@/lib/admin-recording-types";

function formatSize(mb: number | null) {
  if (!mb) return "—";
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

export default function InstructorRecordingsPage() {
  const t = useTranslations("instructorRecordingsPage");
  const [recordings, setRecordings] = useState<AdminRecordingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState<AdminRecordingSummary | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/instructor/recordings");
        const data = await parseApiJson<{ recordings?: AdminRecordingSummary[]; error?: string }>(
          res,
        );
        if (!res.ok) throw new Error(data.error ?? "Failed to load recordings");
        setRecordings(data.recordings ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recordings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recordings;
    return recordings.filter(
      (item) =>
        item.classTitle.toLowerCase().includes(query) ||
        item.batchName.toLowerCase().includes(query) ||
        item.subjectName.toLowerCase().includes(query),
    );
  }, [recordings, search]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((recording) => (
            <div
              key={recording.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <div>
                <h3 className="font-semibold text-card-foreground">{recording.classTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {recording.batchName} · {recording.subjectName}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(recording.scheduledStart).toLocaleString()} · {formatSize(recording.recordingSizeMb)} ·{" "}
                {t("attendees", { count: recording.attendeeCount })}
              </p>
              <button
                type="button"
                onClick={() => setPlaying(recording)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <PlayCircle className="h-4 w-4" />
                {t("play")}
              </button>
            </div>
          ))}
        </div>
      )}

      {playing && (
        <RecordingPlayerModal
          title={playing.classTitle}
          src={playing.recordingUrl}
          videoId={playing.id}
          userId=""
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
