"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, List, Clock } from "lucide-react";
import type { InstructorSession, SessionStatusValue } from "@/lib/instructor-types";
import { useInstructorSessions } from "@/lib/use-instructor-sessions";
import {
  isSessionStartingSoon,
  minutesUntilSessionStart,
} from "@/lib/live-session-utils";

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

function statusBadgeClass(status: SessionStatusValue) {
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

function SessionTimelineCard({
  session,
  t,
  onOpen,
}: {
  session: InstructorSession;
  t: ReturnType<typeof useTranslations>;
  onOpen: (sessionId: string, status: string) => void;
}) {
  const canOpen = session.status === "LIVE" || session.status === "UPCOMING";
  const content = (
    <>
      <div className="flex flex-col items-center justify-center w-16 shrink-0 text-primary font-bold">
        <Clock className="w-4 h-4 mb-1" />
        <span className="text-xs">
          {new Date(session.scheduledStart).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-card-foreground truncate">
          {session.liveClass.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {session.liveClass.subjectName} · {session.liveClass.batchName}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass(session.status)}`}
        >
          {t(`liveClass.status.${session.status}`)}
        </span>
        <span className="text-xs text-muted-foreground">
          {session.liveClass.durationMinutes} {t("instructorSchedulePage.minutesShort")}
        </span>
      </div>
    </>
  );

  if (!canOpen) {
    return (
      <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
        {content}
      </div>
    );
  }

  if (session.status === "UPCOMING") {
    return (
      <button
        type="button"
        onClick={() => onOpen(session.id, session.status)}
        className="flex items-center gap-4 w-full text-left bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/live/${session.id}`}
      className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
    >
      {content}
    </Link>
  );
}

export default function InstructorSchedulePage() {
  const t = useTranslations();
  const [range, setRange] = useState<RangeMode>("WEEKLY");
  const [view, setView] = useState<ViewMode>("TIMELINE");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const { sessions, loading, error, startSession } = useInstructorSessions();

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredSessions = useMemo(
    () =>
      sessions.filter((s) => isWithinRange(new Date(s.scheduledStart), range)),
    [sessions, range],
  );

  const timelineSessions = useMemo(() => {
    if (!selectedDay) return filteredSessions;
    return filteredSessions.filter(
      (session) =>
        startOfDay(new Date(session.scheduledStart)).toDateString() === selectedDay,
    );
  }, [filteredSessions, selectedDay]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, typeof timelineSessions>();
    for (const session of timelineSessions) {
      const key = startOfDay(new Date(session.scheduledStart)).toDateString();
      const existing = map.get(key) ?? [];
      existing.push(session);
      map.set(key, existing);
    }
    return Array.from(map.entries());
  }, [timelineSessions]);

  const selectedDaySessions = useMemo(() => {
    if (!selectedDay) return [];
    return sessions.filter(
      (session) =>
        startOfDay(new Date(session.scheduledStart)).toDateString() === selectedDay,
    );
  }, [selectedDay, sessions]);

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

      {now &&
        sessions.some((session) =>
          isSessionStartingSoon(session.scheduledStart, session.status, now),
        ) && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              {t("instructorDashboard.startingSoon")}
            </p>
            {sessions
              .filter((session) =>
                isSessionStartingSoon(session.scheduledStart, session.status, now),
              )
              .map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
                >
                  <span>
                    {session.liveClass.title} ·{" "}
                    {t("instructorDashboard.startsIn", {
                      minutes: minutesUntilSessionStart(session.scheduledStart, now),
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleOpen(session.id, session.status)}
                    className="inline-flex justify-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    {t("instructorSchedulePage.openClass")}
                  </button>
                </div>
              ))}
          </div>
        )}

      {selectedDay && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {t("instructorSchedulePage.selectedDay", {
                date: new Date(selectedDay).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }),
              })}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {t("instructorSchedulePage.clearDay")}
            </button>
          </div>
          {selectedDaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("instructorSchedulePage.empty")}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDaySessions.map((session) => (
                <SessionTimelineCard
                  key={session.id}
                  session={session}
                  t={t}
                  onOpen={(sessionId, status) => void handleOpen(sessionId, status)}
                />
              ))}
            </div>
          )}
          <Link
            href="/instructor/classes"
            className="inline-block text-xs font-semibold text-primary hover:underline"
          >
            {t("instructorSchedulePage.manageClass")}
          </Link>
        </div>
      )}

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
                {daySessions.map((session) => (
                  <SessionTimelineCard
                    key={session.id}
                    session={session}
                    t={t}
                    onOpen={(sessionId, status) => void handleOpen(sessionId, status)}
                  />
                ))}
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
            const isSelected = selectedDay === cellKey;

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setSelectedDay(cellKey);
                  setView("TIMELINE");
                }}
                className={`min-h-24 rounded-lg border p-2 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : isToday
                      ? "border-primary/60 bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40"
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
