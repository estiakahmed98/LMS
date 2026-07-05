"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Video, Users, Clock, PlayCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getLiveClassesByInstructorId,
  getSessionsByLiveClassId,
  type SessionStatus,
} from "@/lib/mock-data";

type FilterTab = "ALL" | "UPCOMING" | "LIVE" | "COMPLETED" | "MISSED";

function statusBadgeClass(status: SessionStatus) {
  switch (status) {
    case "LIVE":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "UPCOMING":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "COMPLETED":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "MISSED":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function InstructorClassesPage() {
  const t = useTranslations();
  const currentUser = getCurrentUser();
  const instructorId = currentUser?.id ?? "";
  const [filter, setFilter] = useState<FilterTab>("ALL");

  const liveClasses = getLiveClassesByInstructorId(instructorId);

  const rows = liveClasses.flatMap((liveClass) =>
    getSessionsByLiveClassId(liveClass.id).map((session) => ({ liveClass, session })),
  );

  const filteredRows = rows.filter(({ session }) => {
    if (filter === "ALL") return true;
    return session.status === filter;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "ALL", label: t("common.all") },
    { key: "UPCOMING", label: t("liveClass.status.UPCOMING") },
    { key: "LIVE", label: t("liveClass.status.LIVE") },
    { key: "COMPLETED", label: t("liveClass.status.COMPLETED") },
    { key: "MISSED", label: t("liveClass.status.MISSED") },
  ];

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("instructor.myTeachingClasses")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("instructorClassesPage.subtitle")}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRows.map(({ liveClass, session }) => (
          <div
            key={session.id}
            className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-card-foreground">{liveClass.title}</h3>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${statusBadgeClass(session.status)}`}
                >
                  {t(`liveClass.status.${session.status}`)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{liveClass.subjectName}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {session.scheduledStart.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {liveClass.batchName}
                </span>
              </div>
              {session.status === "LIVE" ? (
                <Link
                  href={`/live/${session.id}`}
                  className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("instructorDashboard.rejoinAsHost")}
                </Link>
              ) : session.status === "UPCOMING" ? (
                <Link
                  href={`/live/${session.id}`}
                  className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
                >
                  <Video className="w-4 h-4" />
                  {t("instructorDashboard.startLiveClass")}
                </Link>
              ) : session.recordingUrl ? (
                <a
                  href={session.recordingUrl}
                  className="flex items-center justify-center gap-2 w-full mt-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("instructorClassesPage.viewRecording")}
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filteredRows.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          {t("instructorClassesPage.empty")}
        </p>
      )}
    </div>
  );
}
