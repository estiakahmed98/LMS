"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Video,
  CalendarDays,
  PlayCircle,
  Clock,
  BookOpen,
  Users,
  Search,
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";
import type {
  LearnerLiveClassesPayload,
  LearnerLiveSession,
  SessionStatusValue,
} from "@/lib/learner-live-types";
import {
  isSessionStartingSoon,
  minutesUntilSessionStart,
} from "@/lib/live-session-utils";
import { getYouTubeThumbnailUrl } from "@/lib/youtube";

type TabKey = "SUBJECTS" | "LIVE_CLASSES" | "CALENDAR" | "RECORDINGS" | "ATTENDANCE";

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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

type RecordingDateFilter = "all" | "today" | "last7" | "last30" | "custom";

const recordingDateFilters: RecordingDateFilter[] = [
  "all",
  "today",
  "last7",
  "last30",
  "custom",
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveRecordingDateRange(
  filter: RecordingDateFilter,
  customStart: string,
  customEnd: string,
): { start: Date; end: Date } | null {
  const today = startOfDay(new Date());

  switch (filter) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "last7":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "last30":
      return { start: addDays(today, -29), end: addDays(today, 1) };
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

export default function LearnerLiveClassesPage() {
  const t = useTranslations();
  const [tab, setTab] = useState<TabKey>("LIVE_CLASSES");
  const [payload, setPayload] = useState<LearnerLiveClassesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);
  const [recordingQuery, setRecordingQuery] = useState("");
  const [recordingCourseId, setRecordingCourseId] = useState<"all" | string>("all");
  const [recordingDateFilter, setRecordingDateFilter] =
    useState<RecordingDateFilter>("all");
  const [recordingCustomStart, setRecordingCustomStart] = useState("");
  const [recordingCustomEnd, setRecordingCustomEnd] = useState("");

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/learner/live-classes");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load live classes");
        }
        if (!cancelled) setPayload(data as LearnerLiveClassesPayload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load live classes");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const courses = payload?.courses ?? [];
  const sessions = payload?.sessions ?? [];

  const upcomingSessions = useMemo(
    () => sessions.filter((s) => s.status === "UPCOMING" || s.status === "LIVE"),
    [sessions],
  );
  const todaySessions = useMemo(() => {
    if (!mounted || !now) return [];
    return sessions.filter(
      (s) =>
        startOfDay(new Date(s.scheduledStart)).getTime() ===
        startOfDay(now).getTime(),
    );
  }, [mounted, now, sessions]);
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === "COMPLETED"),
    [sessions],
  );
  const missedSessions = useMemo(
    () => sessions.filter((s) => s.status === "MISSED"),
    [sessions],
  );
  const recordedSessions = useMemo(
    () => completedSessions.filter((s) => s.recordingUrl),
    [completedSessions],
  );

  const recordingDateRange = useMemo(
    () =>
      resolveRecordingDateRange(
        recordingDateFilter,
        recordingCustomStart,
        recordingCustomEnd,
      ),
    [recordingDateFilter, recordingCustomStart, recordingCustomEnd],
  );

  const filteredRecordedSessions = useMemo(() => {
    const normalizedQuery = recordingQuery.trim().toLowerCase();
    return recordedSessions.filter((session) => {
      const matchesQuery =
        !normalizedQuery ||
        session.liveClass.title.toLowerCase().includes(normalizedQuery) ||
        session.liveClass.subjectName.toLowerCase().includes(normalizedQuery) ||
        session.liveClass.courseTitle.toLowerCase().includes(normalizedQuery) ||
        session.liveClass.instructorName.toLowerCase().includes(normalizedQuery);
      const matchesCourse =
        recordingCourseId === "all" || session.liveClass.courseId === recordingCourseId;
      const matchesDate = (() => {
        if (!recordingDateRange) return true;
        const time = new Date(session.scheduledStart).getTime();
        return (
          time >= recordingDateRange.start.getTime() &&
          time < recordingDateRange.end.getTime()
        );
      })();
      return matchesQuery && matchesCourse && matchesDate;
    });
  }, [recordedSessions, recordingQuery, recordingCourseId, recordingDateRange]);

  const startingSoonSessions = useMemo(() => {
    if (!mounted || !now) return [];
    return sessions.filter((session) =>
      isSessionStartingSoon(session.scheduledStart, session.status, now),
    );
  }, [mounted, now, sessions]);

  const playingSession = sessions.find((s) => s.id === playingSessionId);

  const tabs: { key: TabKey; label: string; icon: typeof Video }[] = [
    { key: "SUBJECTS", label: t("learnerLiveClassesPage.tabs.subjects"), icon: BookOpen },
    { key: "LIVE_CLASSES", label: t("learnerLiveClassesPage.tabs.liveClasses"), icon: Video },
    { key: "CALENDAR", label: t("learnerLiveClassesPage.tabs.calendar"), icon: CalendarDays },
    { key: "RECORDINGS", label: t("learnerLiveClassesPage.tabs.recordings"), icon: PlayCircle },
    { key: "ATTENDANCE", label: t("learnerLiveClassesPage.tabs.attendance"), icon: Users },
  ];

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("learnerLiveClassesPage.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("learnerLiveClassesPage.subtitle")}
        </p>
      </div>

      {now && startingSoonSessions.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t("learnerLiveClassesPage.startingSoon")}
          </p>
          {startingSoonSessions.map((session) => {
            const mins = minutesUntilSessionStart(session.scheduledStart, now);
            return (
              <div
                key={session.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
              >
                <span className="text-card-foreground">
                  {session.liveClass.title} ·{" "}
                  {t("learnerLiveClassesPage.startsIn", { minutes: mins })}
                </span>
                <Link
                  href={`/live/${session.id}`}
                  className="inline-flex justify-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                >
                  {t("learnerLiveClassesPage.joinNow")}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 flex-wrap border-b border-border pb-px">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === item.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-card-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "SUBJECTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-card-foreground">{course.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {course.description ?? ""}
              </p>
              <p className="text-xs font-semibold text-primary">
                {t("learnerLiveClassesPage.liveClassCount", {
                  count: course.liveClassCount,
                })}
              </p>
            </div>
          ))}
          {courses.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full text-center py-12">
              {t("learnerLiveClassesPage.noSubjects")}
            </p>
          )}
        </div>
      )}

      {tab === "LIVE_CLASSES" && (
        <div className="space-y-6">
          {todaySessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {t("learnerLiveClassesPage.today")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaySessions.map((session) => (
                  <LiveClassCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("learnerLiveClassesPage.upcoming")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingSessions.map((session) => (
                <LiveClassCard key={session.id} session={session} />
              ))}
            </div>
            {upcomingSessions.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">
                {t("learnerLiveClassesPage.noUpcoming")}
              </p>
            )}
          </div>

          {missedSessions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {t("learnerLiveClassesPage.missed")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missedSessions.map((session) => (
                  <LiveClassCard key={session.id} session={session} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "CALENDAR" && mounted && now && (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => {
            const cellDate = new Date(now);
            cellDate.setDate(cellDate.getDate() - cellDate.getDay() + index);
            const cellKey = startOfDay(cellDate).toDateString();
            const daySessions = sessions.filter(
              (s) =>
                startOfDay(new Date(s.scheduledStart)).toDateString() === cellKey,
            );
            const isToday = cellKey === startOfDay(now).toDateString();

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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "RECORDINGS" && (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-12">
            <label className="relative xl:col-span-5">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recordingQuery}
                onChange={(event) => setRecordingQuery(event.target.value)}
                placeholder={t("learnerLiveClassesPage.recordings.searchPlaceholder")}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={recordingCourseId}
              onChange={(event) => setRecordingCourseId(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-3"
            >
              <option value="all">
                {t("learnerLiveClassesPage.recordings.allCourses")}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <select
              value={recordingDateFilter}
              onChange={(event) =>
                setRecordingDateFilter(event.target.value as RecordingDateFilter)
              }
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
            >
              {recordingDateFilters.map((item) => (
                <option key={item} value={item}>
                  {t(`learnerLiveClassesPage.recordings.dateFilters.${item}`)}
                </option>
              ))}
            </select>
            {recordingDateFilter === "custom" && (
              <>
                <input
                  type="date"
                  value={recordingCustomStart}
                  onChange={(event) => setRecordingCustomStart(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-1"
                />
                <input
                  type="date"
                  value={recordingCustomEnd}
                  onChange={(event) => setRecordingCustomEnd(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-1"
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecordedSessions.map((session) => (
              <div
                key={session.id}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setPlayingSessionId(session.id)}
                  className="group relative block h-28 w-full overflow-hidden bg-linear-to-br from-primary/20 to-primary/10"
                >
                  {session.youtubeVideoId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getYouTubeThumbnailUrl(session.youtubeVideoId)}
                      alt={session.liveClass.title}
                      className="h-full w-full object-cover transition group-hover:opacity-80"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <PlayCircle className="w-8 h-8 text-primary" />
                    </span>
                  )}
                </button>
                <div className="p-4 space-y-1.5">
                  <h3 className="font-semibold text-card-foreground truncate">
                    {session.liveClass.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {session.liveClass.courseTitle} · {session.liveClass.subjectName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.scheduledStart).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => setPlayingSessionId(session.id)}
                    className="block w-full text-center mt-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm"
                  >
                    {t("learnerLiveClassesPage.watchRecording")}
                  </button>
                </div>
              </div>
            ))}
            {filteredRecordedSessions.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full text-center py-12">
                {recordedSessions.length === 0
                  ? t("learnerLiveClassesPage.noRecordings")
                  : t("learnerLiveClassesPage.recordings.noMatches")}
              </p>
            )}
          </div>
        </div>
      )}

      {tab === "ATTENDANCE" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t("learnerLiveClassesPage.table.class")}</th>
                <th className="px-4 py-3">{t("learnerLiveClassesPage.table.date")}</th>
                <th className="px-4 py-3">{t("learnerLiveClassesPage.table.status")}</th>
                <th className="px-4 py-3">{t("learnerLiveClassesPage.table.duration")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {completedSessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-medium text-card-foreground">
                    {session.liveClass.title}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(session.scheduledStart).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {session.myAttendance ? (
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                          session.myAttendance.status === "PRESENT"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : session.myAttendance.status === "LATE"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-red-500/10 text-red-600 border-red-500/20"
                        }`}
                      >
                        {t(`liveClass.attendance.${session.myAttendance.status}`)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {session.myAttendance?.durationMinutes
                      ? `${session.myAttendance.durationMinutes} min`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {completedSessions.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("learnerLiveClassesPage.noAttendance")}
            </p>
          )}
        </div>
      )}

      {playingSessionId && playingSession?.recordingUrl && (
        <RecordingPlayerModal
          title={playingSession.liveClass.title}
          src={playingSession.recordingUrl}
          videoId={playingSessionId}
          userId=""
          youtubeVideoId={playingSession.youtubeVideoId}
          onClose={() => setPlayingSessionId(null)}
        />
      )}
    </div>
  );
}

function LiveClassCard({ session }: { session: LearnerLiveSession }) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startMs = new Date(session.scheduledStart).getTime();
  const canJoin =
    mounted &&
    (session.status === "LIVE" ||
      (session.status === "UPCOMING" && startMs - Date.now() < 10 * 60000));

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-card-foreground">{session.liveClass.title}</h3>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${statusBadgeClass(session.status)}`}
        >
          {t(`liveClass.status.${session.status}`)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-semibold">
          {getInitials(session.liveClass.instructorName)}
        </span>
        {session.liveClass.instructorName}
      </p>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {new Date(session.scheduledStart).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
      {session.status === "LIVE" || session.status === "UPCOMING" ? (
        <Link
          href={canJoin ? `/live/${session.id}` : "#"}
          aria-disabled={!canJoin}
          className={`block w-full text-center px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            canJoin
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-border text-muted-foreground cursor-not-allowed pointer-events-none"
          }`}
        >
          {session.status === "LIVE"
            ? t("learnerLiveClassesPage.joinNow")
            : canJoin
              ? t("learnerLiveClassesPage.joinNow")
              : t("learnerLiveClassesPage.joinAtScheduledTime")}
        </Link>
      ) : (
        <span className="block w-full text-center px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm">
          {t(`liveClass.status.${session.status}`)}
        </span>
      )}
    </div>
  );
}
