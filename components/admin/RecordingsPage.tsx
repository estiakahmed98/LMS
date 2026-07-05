"use client";

import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useTranslations } from "next-intl";
import { PlayCircle, Download, Share2, Check } from "lucide-react";
import {
  getLiveClassById,
  getUserById,
  mockLiveClassSessions,
} from "@/lib/mock-data";

function formatSize(mb?: number) {
  if (!mb) return "-";
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

export default function RecordingsPage() {
  const t = useTranslations("adminRecordingsPage");
  const tAdmin = useTranslations("admin");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const recordedSessions = mockLiveClassSessions.filter((s) => s.recordingUrl);

  function handleShare(sessionId: string, url: string) {
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedId(sessionId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <AdminLayout title={tAdmin("recordings")}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">{tAdmin("recordings")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recordedSessions.map((session) => {
            const liveClass = getLiveClassById(session.liveClassId);
            if (!liveClass) return null;
            const instructor = getUserById(liveClass.instructorId);

            return (
              <div key={session.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="h-32 bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <PlayCircle className="h-10 w-10 text-primary" />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-card-foreground truncate">{liveClass.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {instructor?.name} ·{" "}
                    {session.scheduledStart.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("fileSize")}: {formatSize(session.recordingSizeMb)}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <a
                      href={session.recordingUrl}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {t("play")}
                    </a>
                    <a
                      href={session.recordingUrl}
                      download
                      className="flex items-center justify-center p-2 border border-border rounded-lg hover:bg-muted"
                      aria-label={t("download")}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <button
                      onClick={() => handleShare(session.id, session.recordingUrl ?? "")}
                      className="flex items-center justify-center p-2 border border-border rounded-lg hover:bg-muted"
                      aria-label={t("share")}
                    >
                      {copiedId === session.id ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {recordedSessions.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t("empty")}</p>
        )}
      </div>
    </AdminLayout>
  );
}
