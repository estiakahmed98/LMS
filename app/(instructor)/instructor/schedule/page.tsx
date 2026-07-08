"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, List, Clock } from "lucide-react";
import { useInstructorSessions } from "@/lib/use-instructor-sessions";

type RangeMode = "DAILY" | "WEEKLY" | "MONTHLY";
type ViewMode = "CALENDAR" | "TIMELINE";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWithinRange(date: Date, mode: RangeMode) {
  const now = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);

  if (mode === "DAILY") return diffDays === 0;
  if (mode === "WEEKLY") return diffDays >= 0 && diffDays < 7;
  return diffDays >= 0 && diffDays < 31;
}

export default function InstructorSchedulePage() {
  const t = useTranslations();
  const [range, setRange] = useState<RangeMode>("WEEKLY");
  const [view, setView] = useState<ViewMode>("TIMELINE");
  const { sessions, loading, error, startSession } = useInstructorSessions();

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => isWithinRange(new Date(s.scheduledStart), range)),
    [sessions, range],
  );

  const groupedByDay = useMemo(() => {
    const map = new Map<string, typeof filteredSessions>();
    for (const session of filteredSessions) {
      const key = startOfDay(new Date(session.scheduledStart)).toDateString();
      const existing = map.get(key) ?? [];
      existing.push(session);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [filteredSessions]);

  async function handleOpen(sessionId: string, status: string) {
    if (status === "UPCOMING") {
      try {
        await startSession(sessionId);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to start session");
        return;
      }
    }
    window.location.href = `/live/${sessionId}`;
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("instructor.teachingSchedule")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("instructorSchedulePage.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(["DAILY", "WEEKLY", "MONTHLY"] as RangeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setRange(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  range === mode
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {t(`instructorSchedulePage.range.${mode}`)}
              </button>
            ))}
          </div>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setView("TIMELINE")}
              className={`p-2 rounded-md transition-colors ${
                view === "TIMELINE" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
              aria-label="Timeline view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("CALENDAR")}
              className={`p-2 rounded-md transition-colors ${
                view === "CALENDAR" ? "bg-card shadow-sm" : "text-muted-foreground"
              }`}
              aria-label="Calendar view"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "TIMELINE" ? (
        <div className="space-y-6">
          {groupedByDay.map(([dayKey, daySessions]) => (
            <div key={dayKey}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {new Date(dayKey).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <div className="space-y-2">
                {daySessions.map((session) => {
                  const canOpen =
                    session.status === "LIVE" || session.status === "UPCOMING";
                  const content = (
                    <>
                      <div className="flex flex-col items-center justify-center w-16 shrink-0 text-primary font-bold">
                        <Clock className="w-4 h-4 mb-1" />
                        <span className="text-xs">
                          {new Date(session.scheduledStart).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-card-foreground truncate">
                          {session.liveClass.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.liveClass.subjectName} ·{" "}
                          {session.liveClass.batchName}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        {session.liveClass.durationMinutes}{" "}
                        {t("instructorSchedulePage.minutesShort")}
                      </span>
                    </>
                  );

                  if (!canOpen) {
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-4 bg-card border border-border rounded-lg p-4"
                      >
                        {content}
                      </div>
                    );
                  }

                  if (session.status === "UPCOMING") {
                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => void handleOpen(session.id, session.status)}
                        className="flex items-center gap-4 w-full text-left bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                      >
                        {content}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={session.id}
                      href={`/live/${session.id}`}
                      className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          {groupedByDay.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("instructorSchedulePage.empty")}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => {
            const cellDate = new Date();
            cellDate.setDate(cellDate.getDate() - cellDate.getDay() + index);
            const cellKey = startOfDay(cellDate).toDateString();
            const daySessions = sessions.filter(
              (s) =>
                startOfDay(new Date(s.scheduledStart)).toDateString() === cellKey,
            );
            const isToday = cellKey === startOfDay(new Date()).toDateString();

            return (
              <div
                key={index}
                className={`min-h-24 rounded-lg border p-2 ${
                  isToday ? "border-primary bg-primary/5" : "border-border bg-card"
                }`}
              >
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {cellDate.getDate()}
                </p>
                <div className="space-y-1">
                  {daySessions.slice(0, 2).map((session) => (
                    <div
                      key={session.id}
                      className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5 truncate"
                      title={session.liveClass.title}
                    >
                      {session.liveClass.title}
                    </div>
                  ))}
                  {daySessions.length > 2 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{daySessions.length - 2} {t("instructorSchedulePage.more")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
