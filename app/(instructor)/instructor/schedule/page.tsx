"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, List, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getLiveClassById, getSessionsByInstructorId } from "@/lib/mock-data";

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
  const currentUser = getCurrentUser();
  const instructorId = currentUser?.id ?? "";
  const [range, setRange] = useState<RangeMode>("WEEKLY");
  const [view, setView] = useState<ViewMode>("TIMELINE");

  const sessions = getSessionsByInstructorId(instructorId).sort(
    (a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime(),
  );

  const filteredSessions = useMemo(
    () => sessions.filter((s) => isWithinRange(s.scheduledStart, range)),
    [sessions, range],
  );

  const groupedByDay = useMemo(() => {
    const map = new Map<string, typeof filteredSessions>();
    for (const session of filteredSessions) {
      const key = startOfDay(session.scheduledStart).toDateString();
      const existing = map.get(key) ?? [];
      existing.push(session);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [filteredSessions]);

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
                  const liveClass = getLiveClassById(session.liveClassId);
                  if (!liveClass) return null;
                  return (
                    <Link
                      key={session.id}
                      href={session.status === "LIVE" || session.status === "UPCOMING" ? `/live/${session.id}` : "#"}
                      className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex flex-col items-center justify-center w-16 shrink-0 text-primary font-bold">
                        <Clock className="w-4 h-4 mb-1" />
                        <span className="text-xs">
                          {session.scheduledStart.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-card-foreground truncate">
                          {liveClass.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {liveClass.subjectName} · {liveClass.batchName}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        {liveClass.durationMinutes} {t("instructorSchedulePage.minutesShort")}
                      </span>
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
              (s) => startOfDay(s.scheduledStart).toDateString() === cellKey,
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
                  {daySessions.slice(0, 2).map((session) => {
                    const liveClass = getLiveClassById(session.liveClassId);
                    if (!liveClass) return null;
                    return (
                      <div
                        key={session.id}
                        className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5 truncate"
                        title={liveClass.title}
                      >
                        {liveClass.title}
                      </div>
                    );
                  })}
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
