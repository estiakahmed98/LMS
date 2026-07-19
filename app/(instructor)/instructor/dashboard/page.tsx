"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Video,
  CalendarClock,
  CheckCircle2,
  Users,
  PlayCircle,
  Clock,
  Square,
} from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import type { SessionStatusValue } from "@/lib/instructor-types";
import { useInstructorSessions } from "@/lib/use-instructor-sessions";
import {
  isSessionStartingSoon,
  minutesUntilSessionStart,
} from "@/lib/live-session-utils";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

export default function InstructorDashboardPage() {
  const t = useTranslations();
  const { can } = usePortalPermissions();
  const canViewCourses = can("COURSES", "view");
  const canEditCourses = can("COURSES", "edit");
  const currentUser = useCurrentUser();
  const { sessions, loading, error, startSession, endSession } =
    useInstructorSessions(canViewCourses);
  const [now, setNow] = useState<Date | null>(null);
  const [endBusy, setEndBusy] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const startingSoonSessions = useMemo(() => {
    if (!now) return [];
    return sessions.filter((session) =>
      isSessionStartingSoon(session.scheduledStart, session.status, now),
    );
  }, [now, sessions]);

  const todaySessions = sessions.filter((s) =>
    isSameDay(new Date(s.scheduledStart), now ?? new Date()),
  );
  const upcomingSessions = sessions.filter(
    (s) =>
      s.status === "UPCOMING" &&
      new Date(s.scheduledStart).getTime() > (now?.getTime() ?? Date.now()),
  );
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const liveSessions = sessions.filter((s) => s.status === "LIVE");

  async function handleEnd(sessionId: string) {
    if (!window.confirm(t("instructorClassesPage.endSession.confirm"))) return;
    setEndBusy(true);
    try {
      await endSession(sessionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to end session");
    } finally {
      setEndBusy(false);
    }
  }

  async function handleStart(sessionId: string) {
    try {
      await startSession(sessionId);
      window.location.href = `/live/${sessionId}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start session");
    }
  }

  const stats = [
    {
      title: t("instructorDashboard.stats.todaysClasses"),
      value: todaySessions.length,
      icon: CalendarClock,
      color: "bg-blue-500",
    },
    {
      title: t("instructorDashboard.stats.upcomingClasses"),
      value: upcomingSessions.length,
      icon: Clock,
      color: "bg-primary",
    },
    {
      title: t("instructorDashboard.stats.completedClasses"),
      value: completedSessions.length,
      icon: CheckCircle2,
      color: "bg-green-500",
    },
    {
      title: t("instructorDashboard.stats.liveNow"),
      value: liveSessions.length,
      icon: Video,
      color: "bg-red-500",
    },
  ];

  if (!canViewCourses) {
    return (
      <div className="space-y-2 p-2 md:p-4">
        <h1 className="text-3xl font-bold">
          {t("instructorDashboard.welcome")}{" "}
          <span className="text-primary">{currentUser?.name}</span>
        </h1>
        <p className="text-muted-foreground">
          No dashboard modules are currently available for your role.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {t("instructorDashboard.welcome")}{" "}
          <span className="text-primary">{currentUser?.name}</span>
        </h1>
        <p className="text-muted-foreground">
          {t("instructorDashboard.overview")}
        </p>
      </div>

      {startingSoonSessions.length > 0 && now && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t("instructorDashboard.startingSoon")}
          </p>
          {startingSoonSessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
            >
              <span className="text-card-foreground">
                {session.liveClass.title} ·{" "}
                {t("instructorDashboard.startsIn", {
                  minutes: minutesUntilSessionStart(session.scheduledStart, now),
                })}
              </span>
              {canEditCourses && <button
                type="button"
                onClick={() => void handleStart(session.id)}
                className="inline-flex justify-center px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
              >
                {t("instructorDashboard.prepareClass")}
              </button>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-card-foreground mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {liveSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold">
            {t("instructorDashboard.liveNowHeading")}
          </h2>
          {liveSessions.map((session) => (
            <div
              key={session.id}
              className="bg-card rounded-xl p-6 border border-red-500/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 text-white shrink-0">
                  <Video className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    {t("instructorDashboard.live")}
                  </p>
                  <h3 className="text-lg font-bold text-card-foreground">
                    {session.liveClass.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {t("instructorDashboard.participantsCount", {
                      count: session.attendeeCount,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link
                  href={`/live/${session.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("instructorDashboard.rejoinAsHost")}
                </Link>
                {canEditCourses && <button
                  type="button"
                  onClick={() => void handleEnd(session.id)}
                  disabled={endBusy}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 border border-red-500/30 text-red-600 rounded-lg hover:bg-red-500/10 transition-colors font-semibold text-sm disabled:opacity-50"
                >
                  <Square className="w-4 h-4" />
                  {t("instructorDashboard.endSession")}
                </button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("instructorDashboard.todaysClasses")}
          </h3>
          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 pb-3 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    {session.liveClass.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.scheduledStart).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusBadgeClass(session.status)}`}
                >
                  {t(`liveClass.status.${session.status}`)}
                </span>
              </div>
            ))}
            {todaySessions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("instructorDashboard.noClassesToday")}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("instructorDashboard.upcomingClasses")}
          </h3>
          <div className="space-y-3">
            {upcomingSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="pb-3 border-b border-border last:border-0"
              >
                <p className="text-sm font-medium text-card-foreground">
                  {session.liveClass.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.scheduledStart).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {new Date(session.scheduledStart).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
            {upcomingSessions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("instructorDashboard.noUpcomingClasses")}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("instructorDashboard.completedClasses")}
          </h3>
          <div className="space-y-3">
            {completedSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="pb-3 border-b border-border last:border-0"
              >
                <p className="text-sm font-medium text-card-foreground">
                  {session.liveClass.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.scheduledStart).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
            {completedSessions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("instructorDashboard.noCompletedClasses")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {t("instructor.myTeachingClasses")}
          </h2>
          <Link
            href="/instructor/classes"
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t("instructorDashboard.viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.slice(0, 6).map((session) => {
            const canJoin =
              session.status === "LIVE" || session.status === "UPCOMING";
            return (
              <div
                key={session.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-24 bg-linear-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                  <h3 className="font-bold text-card-foreground">
                    {session.liveClass.title}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {session.liveClass.batchName}
                  </p>
                  <span
                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${statusBadgeClass(session.status)}`}
                  >
                    {t(`liveClass.status.${session.status}`)}
                  </span>
                  {session.status === "LIVE" ? (
                    <div className="space-y-2 mt-2">
                      <Link
                        href={`/live/${session.id}`}
                        className="block w-full text-center px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-red-600 text-white hover:bg-red-700"
                      >
                        {t("instructorDashboard.rejoinAsHost")}
                      </Link>
                      {canEditCourses && <button
                        type="button"
                        onClick={() => void handleEnd(session.id)}
                        disabled={endBusy}
                        className="block w-full text-center px-4 py-2 rounded-lg transition-colors font-medium text-sm border border-red-500/30 text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {t("instructorDashboard.endSession")}
                      </button>}
                    </div>
                  ) : session.status === "UPCOMING" && canEditCourses ? (
                    <button
                      type="button"
                      onClick={() => void handleStart(session.id)}
                      className="block w-full text-center mt-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {t("instructorDashboard.startLiveClass")}
                    </button>
                  ) : (
                    <Link
                      href="/instructor/classes"
                      className={`block w-full text-center mt-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                        canJoin
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {t("instructorDashboard.viewDetails")}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
