"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Video,
  CalendarClock,
  CheckCircle2,
  Users,
  PlayCircle,
  Clock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getLiveClassById,
  getSessionsByInstructorId,
  getAttendanceBySessionId,
  type SessionStatus,
} from "@/lib/mock-data";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

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

export default function InstructorDashboardPage() {
  const t = useTranslations();
  const currentUser = getCurrentUser();
  const instructorId = currentUser?.id ?? "";

  const sessions = getSessionsByInstructorId(instructorId).sort(
    (a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime(),
  );

  const now = new Date();
  const todaySessions = sessions.filter((s) =>
    isSameDay(s.scheduledStart, now),
  );
  const upcomingSessions = sessions.filter(
    (s) =>
      s.status === "UPCOMING" && s.scheduledStart.getTime() > now.getTime(),
  );
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const liveSessions = sessions.filter((s) => s.status === "LIVE");

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
          {liveSessions.map((session) => {
            const liveClass = getLiveClassById(session.liveClassId);
            if (!liveClass) return null;
            const attendeeCount = getAttendanceBySessionId(session.id).length;
            return (
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
                      {liveClass.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {t("instructorDashboard.participantsCount", {
                        count: attendeeCount,
                      })}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/live/${session.id}`}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm"
                >
                  <PlayCircle className="w-4 h-4" />
                  {t("instructorDashboard.rejoinAsHost")}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("instructorDashboard.todaysClasses")}
          </h3>
          <div className="space-y-3">
            {todaySessions.map((session) => {
              const liveClass = getLiveClassById(session.liveClassId);
              if (!liveClass) return null;
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 pb-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {liveClass.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.scheduledStart.toLocaleTimeString("en-US", {
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
              );
            })}
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
            {upcomingSessions.slice(0, 5).map((session) => {
              const liveClass = getLiveClassById(session.liveClassId);
              if (!liveClass) return null;
              return (
                <div
                  key={session.id}
                  className="pb-3 border-b border-border last:border-0"
                >
                  <p className="text-sm font-medium text-card-foreground">
                    {liveClass.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.scheduledStart.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {session.scheduledStart.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
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
            {completedSessions.slice(0, 5).map((session) => {
              const liveClass = getLiveClassById(session.liveClassId);
              if (!liveClass) return null;
              return (
                <div
                  key={session.id}
                  className="pb-3 border-b border-border last:border-0"
                >
                  <p className="text-sm font-medium text-card-foreground">
                    {liveClass.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.scheduledStart.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              );
            })}
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
            const liveClass = getLiveClassById(session.liveClassId);
            if (!liveClass) return null;
            const canJoin =
              session.status === "LIVE" || session.status === "UPCOMING";
            return (
              <div
                key={session.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-24 bg-linear-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                  <h3 className="font-bold text-card-foreground">
                    {liveClass.title}
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {liveClass.batchName}
                  </p>
                  <span
                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${statusBadgeClass(session.status)}`}
                  >
                    {t(`liveClass.status.${session.status}`)}
                  </span>
                  <Link
                    href={
                      session.status === "LIVE"
                        ? `/live/${session.id}`
                        : `/instructor/classes`
                    }
                    className={`block w-full text-center mt-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                      canJoin
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {session.status === "LIVE"
                      ? t("instructorDashboard.startLiveClass")
                      : t("instructorDashboard.viewDetails")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
