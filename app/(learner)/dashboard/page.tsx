"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Clock,
  Award,
  Play,
  BookOpen,
  FileText,
  TrendingUp,
  CheckCircle2,
  LoaderCircle,
  PlayCircle,
  Users,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DEFAULT_LOCALE,
  getStoredLocale,
  subscribeLocaleChanges,
} from "@/lib/locale";
import type {
  LearnerDashboardEnrollment,
  LearnerDashboardPayload,
  LearnerSubmissionStatus,
} from "@/lib/learner-dashboard-types";
import type { LearnerLiveSession } from "@/lib/learner-live-types";

const COLORS = ["#22C55E", "#DC2626", "#E5E7EB"];

function getEnrollmentStatusLabel(status: LearnerDashboardEnrollment["status"]) {
  switch (status) {
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "WITHDRAWN":
      return "Withdrawn";
    case "PENDING":
    default:
      return "Pending";
  }
}

function getEnrollmentStatusClass(status: LearnerDashboardEnrollment["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "REJECTED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "WITHDRAWN":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    case "PENDING":
    default:
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
  }
}

function getDisabledButtonLabel(status: LearnerDashboardEnrollment["status"]) {
  switch (status) {
    case "PENDING":
      return "Waiting for Approval";
    case "REJECTED":
      return "Enrollment Rejected";
    case "WITHDRAWN":
      return "Enrollment Withdrawn";
    case "APPROVED":
    default:
      return "Continue";
  }
}

function formatParticipants(count: number) {
  return `${count} participant${count === 1 ? "" : "s"}`;
}

export default function DashboardPage() {
  const t = useTranslations();
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [dashboard, setDashboard] = useState<LearnerDashboardPayload | null>(null);
  const [liveSessions, setLiveSessions] = useState<LearnerLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(getStoredLocale());
    document.documentElement.lang = getStoredLocale();
    return subscribeLocaleChanges((nextLocale) => {
      setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
    });
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/learner/dashboard", {
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load dashboard.");
        }

        setDashboard(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load dashboard.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveSessions() {
      try {
        const response = await fetch("/api/learner/live-classes", {
          cache: "no-store",
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load live classes.");
        }

        if (!cancelled) {
          setLiveSessions((result?.sessions ?? []) as LearnerLiveSession[]);
        }
      } catch {
        if (!cancelled) {
          setLiveSessions([]);
        }
      }
    }

    void loadLiveSessions();
    const intervalId = window.setInterval(() => {
      void loadLiveSessions();
    }, 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
        <div>
          <h1 className="mb-2 text-xl font-bold">Failed to load dashboard</h1>
          <p className="text-muted-foreground">
            {error || "Dashboard data could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const enrollments = dashboard.enrollments;
  const approvedEnrollments = enrollments
    .filter((enrollment) => enrollment.status === "APPROVED")
    .sort((a, b) => b.progress - a.progress);

  const continueEnrollment = approvedEnrollments.find(
    (enrollment) => enrollment.progress < 100 && enrollment.progress > 0,
  );
  const continueCourse = continueEnrollment?.course ?? null;
  const continueModule = continueCourse?.modules[0];

  const completedCount = dashboard.summary.completedCount;
  const inProgressCount = dashboard.summary.inProgressCount;
  const notStartedCount = dashboard.summary.notStartedCount;
  const avgProgress = dashboard.summary.avgProgress;
  const pendingAssessments = dashboard.summary.pendingAssessments;
  const liveNowSessions = liveSessions.filter((session) => session.status === "LIVE");

  const stats = [
    {
      title: t("dashboard.stats.enrolledCourses"),
      value: dashboard.summary.enrollmentCount,
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      title: t("dashboard.stats.avgProgress"),
      value: `${avgProgress}%`,
      icon: TrendingUp,
      color: "bg-primary",
    },
    {
      title: t("dashboard.stats.pendingAssessments"),
      value: pendingAssessments,
      icon: FileText,
      color: "bg-yellow-500",
    },
    {
      title: t("dashboard.stats.certificatesEarned"),
      value: dashboard.summary.certificateCount,
      icon: Award,
      color: "bg-purple-500",
    },
  ];

  const progressTrend = [
    {
      week: t("dashboard.weekLabel", { week: 1 }),
      progress: Math.max(avgProgress - 40, 0),
    },
    {
      week: t("dashboard.weekLabel", { week: 2 }),
      progress: Math.max(avgProgress - 30, 0),
    },
    {
      week: t("dashboard.weekLabel", { week: 3 }),
      progress: Math.max(avgProgress - 20, 0),
    },
    {
      week: t("dashboard.weekLabel", { week: 4 }),
      progress: Math.max(avgProgress - 10, 0),
    },
    {
      week: t("dashboard.weekLabel", { week: 5 }),
      progress: Math.max(avgProgress - 5, 0),
    },
    { week: t("dashboard.weekLabel", { week: 6 }), progress: avgProgress },
  ];

  const pieData = [
    { name: t("dashboard.charts.completed"), value: completedCount },
    { name: t("dashboard.charts.inProgress"), value: inProgressCount },
    { name: t("dashboard.charts.notStarted"), value: notStartedCount },
  ].filter((entry) => entry.value > 0);

  function getSubmissionStatusLabel(status: LearnerSubmissionStatus) {
    const statusMap: Record<LearnerSubmissionStatus, string> = {
      GRADED: t("dashboard.assessmentStatus.graded"),
      SUBMITTED: t("dashboard.assessmentStatus.submitted"),
      GRADING: t("dashboard.assessmentStatus.grading"),
      DRAFT: t("dashboard.assessmentStatus.draft"),
      REVIEWED: t("dashboard.assessmentStatus.graded"),
    };

    return statusMap[status] ?? status.toLowerCase();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          {t("dashboard.welcome")}{" "}
          <span className="text-primary">{dashboard.user.name}</span>
        </h1>
        <p className="text-muted-foreground">{t("dashboard.overview")}</p>
      </div>

      {liveNowSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">Live now</h2>
          <div className="grid grid-cols-1 gap-4">
            {liveNowSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-6 rounded-2xl border border-red-300 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                      LIVE
                    </p>
                    <h3 className="text-lg font-bold text-card-foreground">
                      {session.liveClass.title}
                    </h3>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {formatParticipants(session.attendeeCount)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/live/${session.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <PlayCircle className="h-4 w-4" />
                  {t("learnerLiveClassesPage.joinNow")}
                </Link>
              </div>
            ))}
          </div>
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

      {continueCourse && continueEnrollment && (
        <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 h-32 shrink-0 rounded-lg bg-linear-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground mb-1">
              {t("dashboard.continue.heading")}
            </h2>
            <h3 className="text-2xl font-bold text-primary mb-1">
              {continueCourse.title}
            </h3>
            {continueModule && (
              <p className="text-sm text-muted-foreground mb-4">
                {continueModule.title}
              </p>
            )}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${continueEnrollment.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-primary">
                {continueEnrollment.progress}%
              </span>
              <Link
                href={
                  continueModule
                    ? `/courses/${continueCourse.id}/module/${continueModule.id}`
                    : `/courses/${continueCourse.id}`
                }
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                <Play className="w-4 h-4" />
                {t("dashboard.continue.resume")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("dashboard.charts.progressOverTime")}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={progressTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" />
              <YAxis
                stroke="var(--muted-foreground)"
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                }}
              />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ fill: "var(--primary)", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("dashboard.charts.courseStatus")}
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">
              {t("dashboard.charts.noEnrollmentData")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("dashboard.activity.title")}
          </h3>
          <div className="space-y-3">
            {dashboard.submissions.slice(0, 5).map((submission) => (
              <div
                key={submission.id}
                className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    {submission.assessmentTitle} -{" "}
                    {getSubmissionStatusLabel(submission.status)}
                    {submission.obtainedMarks !== null &&
                      ` - ${t("dashboard.activity.scored")} ${submission.obtainedMarks} ${t("dashboard.activity.marks")}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleDateString(
                          locale === "bn" ? "bn-BD" : "en-US",
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            ))}
            {dashboard.submissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.activity.empty")}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            {t("dashboard.notifications.title")}
          </h3>
          <div className="space-y-3">
            {dashboard.notifications.slice(0, 4).map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${
                  notification.type === "SUCCESS"
                    ? "bg-green-500/10 border-green-500/20"
                    : notification.type === "WARNING"
                      ? "bg-yellow-500/10 border-yellow-500/20"
                      : notification.type === "ERROR"
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                }`}
              >
                <p className="text-sm font-medium text-card-foreground">
                  {notification.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {notification.message}
                </p>
              </div>
            ))}
            {dashboard.notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.notifications.empty")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div id="courses">
        <h2 className="text-2xl font-bold mb-6">{t("learner.myCourses")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("learner.continueWhere")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboard.enrollments.map((enrollment) => {
            const course = enrollment.course;
            const firstModule = course.modules[0];
            const isCompleted = enrollment.progress === 100;
            const canContinue = enrollment.status === "APPROVED";

            return (
              <div
                key={enrollment.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-linear-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
                  <div
                    className={`mb-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getEnrollmentStatusClass(enrollment.status)}`}
                  >
                    {getEnrollmentStatusLabel(enrollment.status)}
                  </div>
                  <h3 className="font-bold text-lg text-card-foreground">
                    {course.title}
                  </h3>
                </div>

                <div className="p-4 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      {t("learner.hours", { hours: course.durationHours })}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("learner.progress")}
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {isCompleted ? (
                      <>
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {t("learner.completed")}
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          {t("learner.inProgress")}
                        </span>
                      </>
                    )}
                  </div>

                  {canContinue ? (
                    <Link
                      href={
                        isCompleted && enrollment.certificate
                          ? `/certificates/${enrollment.certificate.id}`
                          : firstModule
                            ? `/courses/${course.id}/module/${firstModule.id}`
                            : `/courses/${course.id}`
                      }
                      className="block w-full text-center mt-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm"
                    >
                      {isCompleted && enrollment.certificate
                        ? t("learner.viewCertificate")
                        : t("learner.resume")}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="block w-full cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-center font-medium text-muted-foreground opacity-70"
                    >
                      {getDisabledButtonLabel(enrollment.status)}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {dashboard.enrollments.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">
              {t("learner.noCoursesEnrolled")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
