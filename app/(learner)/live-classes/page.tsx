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
} from "lucide-react";
import { getCurrentUser, getInitials } from "@/lib/auth";
import {
  getCourseById,
  getEnrollmentsByUserId,
  getLiveClassById,
  getSessionById,
  getSessionsForCourseIds,
  getAttendanceForUserSession,
  getLiveClassesByCourseId,
  getUserById,
  type SessionStatus,
} from "@/lib/mock-data";
import RecordingPlayerModal from "@/components/live-class/RecordingPlayerModal";

type TabKey = "SUBJECTS" | "LIVE_CLASSES" | "CALENDAR" | "RECORDINGS" | "ATTENDANCE";

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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function LearnerLiveClassesPage() {
  const t = useTranslations();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id ?? "";
  const [tab, setTab] = useState<TabKey>("LIVE_CLASSES");

  const enrollments = getEnrollmentsByUserId(userId).filter((e) => e.status === "APPROVED");
  const courseIds = enrollments.map((e) => e.courseId);
  const courses = courseIds.map((id) => getCourseById(id)).filter(Boolean);

  const sessions = useMemo(
    () =>
      getSessionsForCourseIds(courseIds).sort(
        (a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime(),
      ),
    [courseIds],
  );

  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);

  const upcomingSessions = sessions.filter(
    (s) => s.status === "UPCOMING" || s.status === "LIVE",
  );
  const todaySessions = mounted && now
    ? sessions.filter((s) => startOfDay(s.scheduledStart).getTime() === startOfDay(now).getTime())
    : [];
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const missedSessions = sessions.filter((s) => s.status === "MISSED");
  const recordedSessions = completedSessions.filter((s) => s.recordingUrl);

  const tabs: { key: TabKey; label: string; icon: typeof Video }[] = [
    { key: "SUBJECTS", label: t("learnerLiveClassesPage.tabs.subjects"), icon: BookOpen },
    { key: "LIVE_CLASSES", label: t("learnerLiveClassesPage.tabs.liveClasses"), icon: Video },
    { key: "CALENDAR", label: t("learnerLiveClassesPage.tabs.calendar"), icon: CalendarDays },
    { key: "RECORDINGS", label: t("learnerLiveClassesPage.tabs.recordings"), icon: PlayCircle },
    { key: "ATTENDANCE", label: t("learnerLiveClassesPage.tabs.attendance"), icon: Users },
  ];

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div>
        <h1 className="text-2xl font-bold">{t("learnerLiveClassesPage.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("learnerLiveClassesPage.subtitle")}
        </p>
      </div>

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
          {courses.map((course) => {
            if (!course) return null;
            const liveClasses = getLiveClassesByCourseId(course.id);
            return (
              <div key={course.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-card-foreground">{course.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                <p className="text-xs font-semibold text-primary">
                  {t("learnerLiveClassesPage.liveClassCount", { count: liveClasses.length })}
                </p>
              </div>
            );
          })}
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
                  <LiveClassCard key={session.id} sessionId={session.id} />
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
                <LiveClassCard key={session.id} sessionId={session.id} />
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
                  <LiveClassCard key={session.id} sessionId={session.id} />
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
              (s) => startOfDay(s.scheduledStart).toDateString() === cellKey,
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "RECORDINGS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recordedSessions.map((session) => {
            const liveClass = getLiveClassById(session.liveClassId);
            if (!liveClass) return null;
            return (
              <div key={session.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="h-28 bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <PlayCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="p-4 space-y-1.5">
                  <h3 className="font-semibold text-card-foreground truncate">{liveClass.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {session.scheduledStart.toLocaleDateString("en-US", {
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
            );
          })}
          {recordedSessions.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full text-center py-12">
              {t("learnerLiveClassesPage.noRecordings")}
            </p>
          )}
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
              {completedSessions.map((session) => {
                const liveClass = getLiveClassById(session.liveClassId);
                const attendance = getAttendanceForUserSession(userId, session.id);
                if (!liveClass) return null;
                return (
                  <tr key={session.id}>
                    <td className="px-4 py-3 font-medium text-card-foreground">{liveClass.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {session.scheduledStart.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {attendance ? (
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                            attendance.status === "PRESENT"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : attendance.status === "LATE"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                          }`}
                        >
                          {t(`liveClass.attendance.${attendance.status}`)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {attendance?.durationMinutes ? `${attendance.durationMinutes} min` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {completedSessions.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {t("learnerLiveClassesPage.noAttendance")}
            </p>
          )}
        </div>
      )}

      {playingSessionId && (
        <RecordingPlayerModal
          title={getLiveClassById(getSessionById(playingSessionId)?.liveClassId ?? "")?.title ?? ""}
          videoId={playingSessionId}
          userId={userId}
          onClose={() => setPlayingSessionId(null)}
        />
      )}
    </div>
  );
}

function LiveClassCard({ sessionId }: { sessionId: string }) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const session = getSessionById(sessionId);
  const liveClass = session ? getLiveClassById(session.liveClassId) : undefined;
  if (!session || !liveClass) return null;

  const canJoin =
    mounted &&
    (session.status === "LIVE" ||
      (session.status === "UPCOMING" &&
        session.scheduledStart.getTime() - Date.now() < 10 * 60000));
  const instructor = getUserById(liveClass.instructorId);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-card-foreground">{liveClass.title}</h3>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${statusBadgeClass(session.status)}`}>
          {t(`liveClass.status.${session.status}`)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-semibold">
          {getInitials(instructor?.name ?? "?")}
        </span>
        {instructor?.name}
      </p>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {session.scheduledStart.toLocaleString("en-US", {
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
