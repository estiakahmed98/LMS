"use client";

import Link from "next/link";
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
  getEnrollmentsByUserId,
  getCourseById,
  getModulesByCourseId,
  getCertificatesByUserId,
  getSubmissionsByUserId,
  getNotificationsByUserId,
  getAssessmentsByCourseId,
} from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth";
import {
  Clock,
  Award,
  Play,
  BookOpen,
  FileText,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

const COLORS = ["#22C55E", "#DC2626", "#E5E7EB"];

export default function DashboardPage() {
  const currentUser = getCurrentUser();
  const userId = currentUser?.id ?? "";

  const allEnrollments = getEnrollmentsByUserId(userId);
  const userEnrollments = allEnrollments
    .filter((e) => e.status === "APPROVED")
    .sort((a, b) => b.progress - a.progress);

  const continueEnrollment = userEnrollments.find(
    (e) => e.progress < 100 && e.progress > 0,
  );
  const continueCourse = continueEnrollment
    ? getCourseById(continueEnrollment.courseId)
    : null;
  const continueModule = continueCourse
    ? getModulesByCourseId(continueCourse.id)[0]
    : undefined;

  const certificates = getCertificatesByUserId(userId);
  const submissions = getSubmissionsByUserId(userId);
  const notifications = getNotificationsByUserId(userId);

  const completedCount = userEnrollments.filter(
    (e) => e.progress === 100,
  ).length;
  const inProgressCount = userEnrollments.filter(
    (e) => e.progress > 0 && e.progress < 100,
  ).length;
  const notStartedCount = userEnrollments.filter(
    (e) => e.progress === 0,
  ).length;

  const avgProgress = userEnrollments.length
    ? Math.round(
        userEnrollments.reduce((sum, e) => sum + e.progress, 0) /
          userEnrollments.length,
      )
    : 0;

  const pendingAssessments = userEnrollments.reduce((count, e) => {
    const assessments = getAssessmentsByCourseId(e.courseId);
    const submitted = assessments.filter((a) =>
      submissions.some((s) => s.assessmentId === a.id && s.status !== "DRAFT"),
    ).length;
    return count + (assessments.length - submitted);
  }, 0);

  const stats = [
    {
      title: "Enrolled Courses",
      value: userEnrollments.length,
      icon: BookOpen,
      color: "bg-blue-500",
    },
    {
      title: "Avg. Progress",
      value: `${avgProgress}%`,
      icon: TrendingUp,
      color: "bg-primary",
    },
    {
      title: "Pending Assessments",
      value: pendingAssessments,
      icon: FileText,
      color: "bg-yellow-500",
    },
    {
      title: "Certificates Earned",
      value: certificates.length,
      icon: Award,
      color: "bg-purple-500",
    },
  ];

  // Mock progress-over-time trend derived from current average progress,
  // since historical snapshots aren't tracked in the mock data.
  const progressTrend = [
    { week: "Wk 1", progress: Math.max(avgProgress - 40, 0) },
    { week: "Wk 2", progress: Math.max(avgProgress - 30, 0) },
    { week: "Wk 3", progress: Math.max(avgProgress - 20, 0) },
    { week: "Wk 4", progress: Math.max(avgProgress - 10, 0) },
    { week: "Wk 5", progress: Math.max(avgProgress - 5, 0) },
    { week: "Wk 6", progress: avgProgress },
  ];

  const pieData = [
    { name: "Completed", value: completedCount },
    { name: "In Progress", value: inProgressCount },
    { name: "Not Started", value: notStartedCount },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Welcome back,{" "}
          <span className="text-primary">{currentUser?.name}</span>
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your learning progress.
        </p>
      </div>

      {/* Stats Cards */}
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

      {/* Continue Where You Left Off */}
      {continueCourse && continueEnrollment && (
        <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row gap-6">
          <div className="w-full sm:w-48 h-32 shrink-0 rounded-lg bg-linear-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-muted-foreground mb-1">
              Continue where you left off
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
              ></div>
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
                Resume
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Progress Over Time
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
            Course Status
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">
              No enrollment data yet.
            </p>
          )}
        </div>
      </div>

      {/* Recent Activity and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {submissions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">
                    Assessment {s.status.toLowerCase()}
                    {s.obtainedMarks !== undefined &&
                      ` · Scored ${s.obtainedMarks} marks`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.submittedAt
                      ? new Date(s.submittedAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recent activity yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Notifications
          </h3>
          <div className="space-y-3">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-lg border ${
                  n.type === "SUCCESS"
                    ? "bg-green-500/10 border-green-500/20"
                    : n.type === "WARNING"
                      ? "bg-yellow-500/10 border-yellow-500/20"
                      : n.type === "ERROR"
                        ? "bg-red-500/10 border-red-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                }`}
              >
                <p className="text-sm font-medium text-card-foreground">
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Enrolled Courses Grid */}
      <div id="courses">
        <h2 className="text-2xl font-bold mb-6">My Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userEnrollments.map((enrollment) => {
            const course = getCourseById(enrollment.courseId);
            if (!course) return null;
            const firstModule = getModulesByCourseId(course.id)[0];
            const certificate = certificates.find(
              (c) => c.courseId === course.id,
            );
            const isCompleted = enrollment.progress === 100;

            return (
              <div
                key={enrollment.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="h-32 bg-linear-to-br from-primary/20 to-primary/10 p-4 flex flex-col justify-end">
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
                    <span>{course.duration}h</span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Progress
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    {isCompleted ? (
                      <>
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          Completed
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          In Progress
                        </span>
                      </>
                    )}
                  </div>

                  <Link
                    href={
                      isCompleted && certificate
                        ? `/certificates/${certificate.id}`
                        : firstModule
                          ? `/courses/${course.id}/module/${firstModule.id}`
                          : `/courses/${course.id}`
                    }
                    className="block w-full text-center mt-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm"
                  >
                    {isCompleted ? "View Certificate" : "Resume"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {userEnrollments.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">
              No courses enrolled yet. Explore our course catalog to get
              started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
