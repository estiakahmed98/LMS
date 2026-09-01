"use client";

import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import IndividualStudentReportsTab from "@/components/admin/IndividualStudentReportsTab";
import type {
  AdminAssessmentReportRow,
  AdminCourseReportRow,
  AdminMarksheetRow,
  AdminMcqResultRow,
  AdminQuestionAnalyticsRow,
  AdminBatchReportRow,
  AdminReportsPayload,
  AdminReportType,
} from "@/lib/admin-report-types";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Download,
  Eye,
  GraduationCap,
  Gauge,
  LoaderCircle,
  Printer,
  RotateCcw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

type PageTab = "overview" | "students";

type ExportFormat = "CSV" | "PDF";

type Notice =
  | { key: "ready" | "scheduleSaved" }
  | { key: "exported"; report: string; format: ExportFormat };

const reportTypes: {
  key: AdminReportType;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "overview", label: "Overview", icon: Gauge },
  { key: "course", label: "Course Reports", icon: BookOpen },
  { key: "assessment", label: "Assessment Reports", icon: ClipboardCheck },
  { key: "marksheet", label: "Marksheets", icon: GraduationCap },
  { key: "mcq", label: "MCQ Results", icon: Target },
  { key: "question", label: "Question Analysis", icon: AlertTriangle },
  { key: "batch", label: "Batch & Classes", icon: Users },
  { key: "student", label: "Student Progress", icon: TrendingUp },
  { key: "certificate", label: "Certificates", icon: Award },
  { key: "audit", label: "Audit Logs", icon: Eye },
];

function getAssessmentTypeLabel(type: string) {
  if (type === "PRACTICAL") return "Lab";
  if (type === "WRITTEN") return "Written";
  if (type === "MCQ") return "MCQ";
  return "Mixed";
}

function getAssessmentTypeClass(type: string) {
  switch (type) {
    case "MCQ":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
    case "WRITTEN":
      return "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300";
    case "PRACTICAL":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
    default:
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }
}

function formatDate(value: string | null, localeTag: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(passed: boolean | null) {
  if (passed === true) return "bg-emerald-50 text-emerald-700";
  if (passed === false) return "bg-red-50 text-red-700";
  return "bg-muted text-muted-foreground";
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
};

export default function ReportsActionPage() {
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canExport = can("REPORTS", "export");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);

  const [data, setData] = useState<AdminReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageTab, setPageTab] = useState<PageTab>("overview");
  const [activeReport, setActiveReport] = useState<AdminReportType>("overview");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedCohortId, setSelectedCohortId] = useState("all");
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all");
  const [notice, setNotice] = useState<Notice>({ key: "ready" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/reports", { cache: "no-store" });
      const json = (await response.json()) as AdminReportsPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load reports.");
      }
      setData(json);
    } catch (caught) {
      setData(null);
      setError(
        caught instanceof Error ? caught.message : "Failed to load reports.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const hasLoadedOverview = useRef(false);
  useEffect(() => {
    if (pageTab !== "overview" || hasLoadedOverview.current) return;
    hasLoadedOverview.current = true;
    void loadReports();
  }, [pageTab, loadReports]);

  const filteredAssessmentRows = useMemo(() => {
    return (data?.rows.assessments ?? []).filter((row) => {
      const courseMatch =
        selectedCourseId === "all" || row.courseId === selectedCourseId;
      const typeMatch =
        selectedAssessmentType === "all" || row.type === selectedAssessmentType;
      return courseMatch && typeMatch;
    });
  }, [data?.rows.assessments, selectedAssessmentType, selectedCourseId]);

  const filteredMcqRows = useMemo(() => {
    return (data?.rows.mcqResults ?? []).filter((row) => {
      return selectedCourseId === "all" || row.courseId === selectedCourseId;
    });
  }, [data?.rows.mcqResults, selectedCourseId]);

  const filteredQuestionRows = useMemo(
    () =>
      (data?.rows.questionAnalytics ?? []).filter(
        (row) =>
          selectedCourseId === "all" || row.courseId === selectedCourseId,
      ),
    [data?.rows.questionAnalytics, selectedCourseId],
  );

  const filteredBatchRows = useMemo(
    () =>
      (data?.rows.batches ?? []).filter(
        (row) =>
          selectedCourseId === "all" || row.courseId === selectedCourseId,
      ),
    [data?.rows.batches, selectedCourseId],
  );

  const selectedCohort = useMemo(
    () => (data?.cohorts ?? []).find((cohort) => cohort.id === selectedCohortId) ?? null,
    [data?.cohorts, selectedCohortId],
  );

  /**
   * Live snapshot for the selected cohort, since none of the Overview charts
   * or org-wide stat cards are per-student — this is the one place a cohort
   * filter has something concrete to show. Built from the marksheet rows
   * (each already course + cohort scoped) rather than a fresh query.
   */
  const cohortSnapshot = useMemo(() => {
    if (!data || selectedCohortId === "all") return null;
    const rows = data.rows.marksheets.filter(
      (row) =>
        (selectedCourseId === "all" || row.courseId === selectedCourseId) &&
        row.batchIds.includes(selectedCohortId),
    );
    if (rows.length === 0) {
      return { studentCount: 0, avgProgress: 0, passRate: 0, atRisk: 0 };
    }
    const studentIds = new Set(rows.map((row) => row.studentId));
    const avgProgress = Math.round(
      rows.reduce((sum, row) => sum + row.courseProgress, 0) / rows.length,
    );
    const gradedTotal = rows.reduce((sum, row) => sum + row.passedCount + row.failedCount, 0);
    const passedTotal = rows.reduce((sum, row) => sum + row.passedCount, 0);
    const passRate = gradedTotal > 0 ? Math.round((passedTotal / gradedTotal) * 100) : 0;
    const atRisk = rows.filter((row) => row.failedCount > 0).length;
    return { studentCount: studentIds.size, avgProgress, passRate, atRisk };
  }, [data, selectedCourseId, selectedCohortId]);

  const currentRows = useMemo(() => {
    if (!data) return [];
    switch (activeReport) {
      case "overview":
      case "course":
        return data.rows.courses.filter(
          (row) =>
            selectedCourseId === "all" || row.courseId === selectedCourseId,
        );
      case "assessment":
        return filteredAssessmentRows;
      case "marksheet":
        return data.rows.marksheets.filter(
          (row) =>
            (selectedCourseId === "all" || row.courseId === selectedCourseId) &&
            (selectedCohortId === "all" || row.batchIds.includes(selectedCohortId)),
        );
      case "mcq":
        return filteredMcqRows;
      case "question":
        return filteredQuestionRows;
      case "batch":
        return filteredBatchRows;
      case "student":
        return data.rows.students.filter(
          (row) =>
            (selectedCourseId === "all" || row.courseId === selectedCourseId) &&
            (selectedCohortId === "all" || row.batchIds.includes(selectedCohortId)),
        );
      case "certificate":
        return data.rows.certificates.filter(
          (row) =>
            selectedCourseId === "all" || row.courseId === selectedCourseId,
        );
      case "audit":
        return data.rows.audit;
      default:
        return [];
    }
  }, [
    activeReport,
    data,
    filteredAssessmentRows,
    filteredBatchRows,
    filteredMcqRows,
    filteredQuestionRows,
    selectedCourseId,
    selectedCohortId,
  ]);

  const totalPages = Math.max(1, Math.ceil(currentRows.length / pageSize));
  const paginatedRows = currentRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const showingFrom = currentRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, currentRows.length);

  const chartRows = filteredAssessmentRows.slice(0, 12).map((row) => ({
    assessment: row.assessment.split(" ").slice(0, 3).join(" "),
    passRate: row.passRate,
  }));
  const questionChartRows = filteredQuestionRows.slice(0, 10).map((row) => ({
    question: `Q${row.questionNumber} · ${row.assessment.split(" ").slice(0, 2).join(" ")}`,
    correct: row.accuracyRate,
    wrong: row.errorRate,
  }));
  useEffect(() => {
    setPage(1);
  }, [selectedCourseId, selectedCohortId]);

  function getReportLabel(report: AdminReportType) {
    return reportTypes.find((item) => item.key === report)?.label ?? report;
  }

  function getNoticeText(value: Notice) {
    if (value.key === "exported") {
      return `${value.report} exported as ${value.format}.`;
    }
    if (value.key === "scheduleSaved") return "Report schedule saved.";
    return data
      ? `Live report data loaded ${formatDate(data.generatedAt, localeTag)}.`
      : "Choose filters and generate your report.";
  }

  function exportReport() {
    const params = new URLSearchParams({ report: activeReport });
    if (selectedCourseId !== "all") params.set("courseId", selectedCourseId);
    const href = `/api/admin/reports/export?${params.toString()}`;
    window.location.assign(href);
    setNotice({
      key: "exported",
      report: getReportLabel(activeReport),
      format: "CSV",
    });
  }

  function changeReport(report: AdminReportType) {
    setActiveReport(report);
    setPage(1);
  }

  function changeCourse(value: string) {
    setSelectedCourseId(value);
    setPage(1);
  }

  function changeCohort(value: string) {
    setSelectedCohortId(value);
    setPage(1);
  }

  function changeAssessmentType(value: string) {
    setSelectedAssessmentType(value);
    setPage(1);
  }

  const stats = data?.stats ?? {
    totalStudents: 0,
    totalAssessments: 0,
    totalSubmissions: 0,
    totalCertificates: 0,
    passRate: 0,
    failRate: 0,
    completionRate: 0,
    averageScore: 0,
    atRiskStudents: 0,
    gradingBacklog: 0,
    attendanceRate: 0,
  };

  return (
    <AdminLayout title={tAdmin("reports")}>
      <div className="space-y-6 p-4 sm:p-6 print:p-0">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Executive intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Institute Reports Dashboard
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Institution, course, learner, assessment, question and live-class
              health in one decision-ready report.
            </p>
          </div>
          <div className="text-left text-xs text-muted-foreground sm:text-right">
            <p>Last refreshed</p>
            <p className="mt-1 font-semibold text-foreground">
              {data ? formatDate(data.generatedAt, localeTag) : "Loading…"}
            </p>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-border pb-1 print:hidden">
          <button
            type="button"
            onClick={() => setPageTab("overview")}
            className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pageTab === "overview"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setPageTab("students")}
            className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors ${
              pageTab === "students"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Individual Student Reports
          </button>
        </div>

        {pageTab === "students" ? (
          <IndividualStudentReportsTab localeTag={localeTag} />
        ) : (
        <>
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 print:hidden">
          <div className="grid gap-3 lg:grid-cols-[160px_1fr_1fr_220px_auto]">
            <button
              type="button"
              onClick={() => void loadReports()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </button>

            <select
              value={selectedCourseId}
              onChange={(event) => changeCourse(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Courses</option>
              {(data?.courses ?? []).map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <select
              value={selectedCohortId}
              onChange={(event) => changeCohort(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Cohorts</option>
              {(data?.cohorts ?? []).map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.code})
                </option>
              ))}
            </select>

            <select
              value={selectedAssessmentType}
              onChange={(event) => changeAssessmentType(event.target.value)}
              disabled={
                activeReport === "mcq" ||
                activeReport === "question" ||
                activeReport === "batch" ||
                activeReport === "student" ||
                activeReport === "marksheet"
              }
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
            >
              <option value="all">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="WRITTEN">Written</option>
              <option value="PRACTICAL">Lab</option>
            </select>

            {canExport && (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={exportReport}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  <Printer className="h-4 w-4" />
                  Print / PDF
                </button>
              </div>
            )}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {getNoticeText(notice)}
          </p>
          {error ? (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          ) : null}
        </section>

        {selectedCohort && cohortSnapshot && (
          <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Cohort snapshot
            </p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground">
              {selectedCohort.name} ({selectedCohort.code})
              {selectedCourseId !== "all" && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  in {(data?.courses ?? []).find((c) => c.id === selectedCourseId)?.title ?? "selected course"}
                </span>
              )}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={Users}
                label="Students"
                value={numberFormatter.format(cohortSnapshot.studentCount)}
                detail="Enrolled through this cohort"
                tone="blue"
              />
              <StatCard
                icon={TrendingUp}
                label="Avg. progress"
                value={`${numberFormatter.format(cohortSnapshot.avgProgress)}%`}
                detail="Across matching enrollments"
                tone="violet"
              />
              <StatCard
                icon={Target}
                label="Pass rate"
                value={`${numberFormatter.format(cohortSnapshot.passRate)}%`}
                detail="Of graded assessments"
                tone="emerald"
              />
              <StatCard
                icon={AlertTriangle}
                label="Students with a fail"
                value={numberFormatter.format(cohortSnapshot.atRisk)}
                detail="At least one failed assessment"
                tone={cohortSnapshot.atRisk > 0 ? "rose" : "emerald"}
              />
            </div>
          </section>
        )}

        <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Unique learners"
            value={numberFormatter.format(stats.totalStudents)}
            detail={`${numberFormatter.format(stats.atRiskStudents)} currently at risk`}
            tone="blue"
          />
          <StatCard
            icon={Target}
            label="Assessment pass rate"
            value={`${numberFormatter.format(stats.passRate)}%`}
            detail={`${numberFormatter.format(stats.failRate)}% fail rate`}
            tone="emerald"
          />
          <StatCard
            icon={TrendingUp}
            label="Course completion"
            value={`${numberFormatter.format(stats.completionRate)}%`}
            detail="Across approved enrollments"
            tone="violet"
          />
          <StatCard
            icon={Gauge}
            label="Average score"
            value={`${numberFormatter.format(stats.averageScore)}%`}
            detail={`${numberFormatter.format(stats.totalSubmissions)} total submissions`}
            tone="cyan"
          />
          <StatCard
            icon={ClipboardCheck}
            label="Assessments"
            value={numberFormatter.format(stats.totalAssessments)}
            detail={`${numberFormatter.format(stats.gradingBacklog)} awaiting grading`}
            tone="amber"
          />
          <StatCard
            icon={BookOpen}
            label="Class attendance"
            value={`${numberFormatter.format(stats.attendanceRate)}%`}
            detail="Present and late attendance"
            tone="indigo"
          />
          <StatCard
            icon={Award}
            label="Certificates issued"
            value={numberFormatter.format(stats.totalCertificates)}
            detail="Verified course completions"
            tone="fuchsia"
          />
          <StatCard
            icon={AlertTriangle}
            label="Learners at risk"
            value={numberFormatter.format(stats.atRiskStudents)}
            detail="Low progress or failed assessment"
            tone={stats.atRiskStudents > 0 ? "rose" : "emerald"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="Assessment Pass Rate"
            description="Pass percentage for the latest assessments in the selected course."
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="assessment" stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="passRate"
                  name="Pass rate %"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Six-month outcome trend"
            description="Submission volume and graded pass rate over time."
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data?.trends ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="#3b82f6"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  name="Pass rate %"
                  stroke="#10b981"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:col-span-2">
            <ChartCard
              title="Question correctness vs error rate"
              description="The highest-error MCQs appear first so academic teams can revise teaching or question quality."
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={questionChartRows}
                  layout="vertical"
                  margin={{ left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    type="category"
                    dataKey="question"
                    width={120}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar
                    dataKey="correct"
                    name="Correct %"
                    stackId="result"
                    fill="#10b981"
                  />
                  <Bar
                    dataKey="wrong"
                    name="Wrong / unanswered %"
                    stackId="result"
                    fill="#ef4444"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <aside className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Executive attention
                </p>
                <h2 className="mt-1 text-lg font-semibold text-card-foreground">
                  Priority signals
                </h2>
              </div>

              <InsightRow
                icon={AlertTriangle}
                label="At-risk learners"
                value={numberFormatter.format(stats.atRiskStudents)}
                detail="Failed results or progress below 35%"
                tone="text-red-600 bg-red-500/10"
              />
              <InsightRow
                icon={ClipboardCheck}
                label="Grading backlog"
                value={numberFormatter.format(stats.gradingBacklog)}
                detail="Submitted or currently under grading"
                tone="text-amber-600 bg-amber-500/10"
              />
              <InsightRow
                icon={GraduationCap}
                label="Hardest MCQ"
                value={
                  filteredQuestionRows[0]
                    ? `${numberFormatter.format(filteredQuestionRows[0].errorRate)}% error`
                    : "No data"
                }
                detail={
                  filteredQuestionRows[0]
                    ? `${filteredQuestionRows[0].assessment} · Q${filteredQuestionRows[0].questionNumber}`
                    : "No MCQ attempts recorded"
                }
                tone="text-primary bg-primary/10"
              />

              <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
                All metrics are calculated from live enrollments, submissions,
                grading, certificates and class-attendance records.
              </div>
            </aside>
          </div>
        </section>
        </>
        )}
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
  tone?:
    | "blue"
    | "emerald"
    | "violet"
    | "cyan"
    | "amber"
    | "indigo"
    | "fuchsia"
    | "rose";
}) {
  const palette = {
    blue: {
      card: "border-blue-200/80 bg-gradient-to-br from-blue-50 via-blue-50/50 to-card dark:border-blue-900/80 dark:from-blue-950/60 dark:via-blue-950/20",
      accent: "bg-blue-500",
      icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      value: "text-blue-700 dark:text-blue-300",
    },
    emerald: {
      card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-card dark:border-emerald-900/80 dark:from-emerald-950/60 dark:via-emerald-950/20",
      accent: "bg-emerald-500",
      icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      value: "text-emerald-700 dark:text-emerald-300",
    },
    violet: {
      card: "border-violet-200/80 bg-gradient-to-br from-violet-50 via-violet-50/50 to-card dark:border-violet-900/80 dark:from-violet-950/60 dark:via-violet-950/20",
      accent: "bg-violet-500",
      icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
      value: "text-violet-700 dark:text-violet-300",
    },
    cyan: {
      card: "border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-cyan-50/50 to-card dark:border-cyan-900/80 dark:from-cyan-950/60 dark:via-cyan-950/20",
      accent: "bg-cyan-500",
      icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
      value: "text-cyan-700 dark:text-cyan-300",
    },
    amber: {
      card: "border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50/50 to-card dark:border-amber-900/80 dark:from-amber-950/60 dark:via-amber-950/20",
      accent: "bg-amber-500",
      icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      value: "text-amber-700 dark:text-amber-300",
    },
    indigo: {
      card: "border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-card dark:border-indigo-900/80 dark:from-indigo-950/60 dark:via-indigo-950/20",
      accent: "bg-indigo-500",
      icon: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
      value: "text-indigo-700 dark:text-indigo-300",
    },
    fuchsia: {
      card: "border-fuchsia-200/80 bg-gradient-to-br from-fuchsia-50 via-fuchsia-50/50 to-card dark:border-fuchsia-900/80 dark:from-fuchsia-950/60 dark:via-fuchsia-950/20",
      accent: "bg-fuchsia-500",
      icon: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
      value: "text-fuchsia-700 dark:text-fuchsia-300",
    },
    rose: {
      card: "border-rose-200/80 bg-gradient-to-br from-rose-50 via-rose-50/50 to-card dark:border-rose-900/80 dark:from-rose-950/60 dark:via-rose-950/20",
      accent: "bg-rose-500",
      icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
      value: "text-rose-700 dark:text-rose-300",
    },
  }[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${palette.card}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${palette.accent}`} />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground/70">{label}</p>
        <span className={`rounded-lg p-2 ${palette.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <h2 className={`mt-2 text-2xl font-bold ${palette.value}`}>{value}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 rounded-lg p-2 ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{label}</p>
          <p className="shrink-0 text-sm font-bold">{value}</p>
        </div>
        <p
          className="mt-0.5 truncate text-xs text-muted-foreground"
          title={detail}
        >
          {detail}
        </p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="break-inside-avoid rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ReportTable({
  activeReport,
  rows,
  localeTag,
  numberFormatter,
}: {
  activeReport: AdminReportType;
  rows: unknown[];
  localeTag: string;
  numberFormatter: Intl.NumberFormat;
}) {
  if (activeReport === "overview" || activeReport === "course") {
    return (
      <Table
        minWidth="min-w-190"
        headings={[
          "Course",
          "Students",
          "Assessments",
          "Completed",
          "Avg Progress",
          "Pass Rate",
        ]}
      >
        {(rows as AdminCourseReportRow[]).map((row) => (
          <tr key={row.courseId}>
            <td className="px-4 py-4 text-sm font-semibold">{row.course}</td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.students)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.assessments)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.completed)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.avgProgress)}%
            </td>
            <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
              {numberFormatter.format(row.passRate)}%
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "assessment") {
    return (
      <Table
        minWidth="min-w-225"
        headings={[
          "Assessment",
          "Course",
          "Type",
          "Marks",
          "Submissions",
          "Pending",
          "Avg Score",
          "Pass Rate",
        ]}
      >
        {(rows as AdminAssessmentReportRow[]).map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-4 text-sm font-semibold">
              {row.assessment}
            </td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${getAssessmentTypeClass(row.type)}`}
              >
                {getAssessmentTypeLabel(row.type)}
              </span>
            </td>
            <td className="px-4 py-4 text-sm">
              {row.totalMarks}/{row.passingMarks}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.submissions)}
            </td>
            <td className="px-4 py-4 text-sm text-amber-600">
              {numberFormatter.format(row.pending)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.avgScore)}
            </td>
            <td className="px-4 py-4 text-sm font-semibold text-emerald-600">
              {numberFormatter.format(row.passRate)}%
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "mcq") {
    return (
      <Table
        minWidth="min-w-[1080px]"
        headings={[
          "Student",
          "Assessment",
          "Course",
          "Score",
          "Percent",
          "Correct",
          "Answered",
          "Result",
          "Submitted",
          "Answer Sheet",
        ]}
      >
        {(rows as AdminMcqResultRow[]).map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-4 text-sm">
              <p className="font-semibold">{row.student}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </td>
            <td className="px-4 py-4 text-sm font-medium">{row.assessment}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">
              {row.obtainedMarks === null
                ? "Pending"
                : `${numberFormatter.format(row.obtainedMarks)}/${numberFormatter.format(row.totalMarks)}`}
            </td>
            <td className="px-4 py-4 text-sm">
              {row.scorePercent === null
                ? "-"
                : `${numberFormatter.format(row.scorePercent)}%`}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.correct)}/
              {numberFormatter.format(row.questionCount)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.answered)}/
              {numberFormatter.format(row.questionCount)}
            </td>
            <td className="px-4 py-4">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(row.passed)}`}
              >
                {row.passed === null
                  ? row.status
                  : row.passed
                    ? "Passed"
                    : "Failed"}
              </span>
            </td>
            <td className="px-4 py-4 text-sm text-muted-foreground">
              {formatDate(row.submittedAt, localeTag)}
            </td>
            <td className="px-4 py-4">
              <Link
                href={`/admin/reports/mcq-results/${row.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                <Eye className="h-3.5 w-3.5" />
                Open
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "marksheet") {
    return (
      <Table
        minWidth="min-w-[1080px]"
        headings={[
          "Student",
          "Course",
          "Assessments",
          "Total",
          "Percent",
          "Passed",
          "Pending",
          "Progress",
          "Status",
          "Marksheet",
        ]}
      >
        {(rows as AdminMarksheetRow[]).map((row) => (
          <tr key={`${row.studentId}-${row.courseId}`}>
            <td className="px-4 py-4 text-sm">
              <p className="font-semibold">{row.student}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.gradedCount)}/
              {numberFormatter.format(row.assessmentCount)} graded
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.obtainedMarks)}/
              {numberFormatter.format(row.totalMarks)}
            </td>
            <td className="px-4 py-4 text-sm">
              {row.scorePercent === null
                ? "-"
                : `${numberFormatter.format(row.scorePercent)}%`}
            </td>
            <td className="px-4 py-4 text-sm text-emerald-600">
              {numberFormatter.format(row.passedCount)}
            </td>
            <td className="px-4 py-4 text-sm text-amber-600">
              {numberFormatter.format(row.pendingCount)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.courseProgress)}%
            </td>
            <td className="px-4 py-4 text-sm">{row.status}</td>
            <td className="px-4 py-4">
              <Link
                href={`/admin/reports/marksheets/${row.courseId}/${row.studentId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                <Eye className="h-3.5 w-3.5" />
                Open
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "question") {
    return (
      <Table
        minWidth="min-w-[1100px]"
        headings={[
          "Question",
          "Assessment / Course",
          "Difficulty",
          "Attempts",
          "Correct",
          "Wrong",
          "Unanswered",
          "Accuracy",
          "Error Rate",
        ]}
      >
        {(rows as AdminQuestionAnalyticsRow[]).map((row) => (
          <tr key={row.questionId}>
            <td className="max-w-sm px-4 py-4 text-sm">
              <p className="mb-1 font-bold">
                Q{numberFormatter.format(row.questionNumber)}
              </p>
              <p
                className="line-clamp-2 text-muted-foreground"
                title={row.question}
              >
                {row.question}
              </p>
            </td>
            <td className="px-4 py-4 text-sm">
              <p className="font-semibold">{row.assessment}</p>
              <p className="text-xs text-muted-foreground">{row.course}</p>
            </td>
            <td className="px-4 py-4 text-xs font-semibold">
              {row.difficulty}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.attempts)}
            </td>
            <td className="px-4 py-4 text-sm text-emerald-600">
              {numberFormatter.format(row.correct)}
            </td>
            <td className="px-4 py-4 text-sm text-red-600">
              {numberFormatter.format(row.wrong)}
            </td>
            <td className="px-4 py-4 text-sm text-amber-600">
              {numberFormatter.format(row.unanswered)}
            </td>
            <td className="px-4 py-4 text-sm font-bold text-emerald-600">
              {numberFormatter.format(row.accuracyRate)}%
            </td>
            <td className="px-4 py-4">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  row.errorRate >= 60
                    ? "bg-red-500/10 text-red-600"
                    : row.errorRate >= 35
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {numberFormatter.format(row.errorRate)}%
              </span>
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "batch") {
    return (
      <Table
        minWidth="min-w-[1000px]"
        headings={[
          "Batch / Class",
          "Course",
          "Instructor",
          "Sessions",
          "Completed",
          "Present",
          "Late",
          "Absent",
          "Attendance",
          "Avg Duration",
        ]}
      >
        {(rows as AdminBatchReportRow[]).map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-4 text-sm font-semibold">{row.batch}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">
              {row.instructors.join(", ") || "-"}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.classes)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.completedClasses)}
            </td>
            <td className="px-4 py-4 text-sm text-emerald-600">
              {numberFormatter.format(row.present)}
            </td>
            <td className="px-4 py-4 text-sm text-amber-600">
              {numberFormatter.format(row.late)}
            </td>
            <td className="px-4 py-4 text-sm text-red-600">
              {numberFormatter.format(row.absent)}
            </td>
            <td className="px-4 py-4 text-sm font-bold">
              {numberFormatter.format(row.attendanceRate)}%
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.averageDurationMinutes)} min
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "student") {
    return (
      <Table
        minWidth="min-w-195"
        headings={[
          "Student",
          "Course",
          "Progress",
          "Avg Score",
          "Passed / Failed",
          "Pending",
          "Risk",
          "Certificate",
        ]}
      >
        {(rows as AdminReportsPayload["rows"]["students"]).map((row) => (
          <tr key={`${row.student}-${row.course}`}>
            <td className="px-4 py-4 text-sm">
              <p className="font-semibold">{row.student}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.progress)}%
            </td>
            <td className="px-4 py-4 text-sm">
              {row.scorePercent === null
                ? "-"
                : `${numberFormatter.format(row.scorePercent)}%`}
            </td>
            <td className="px-4 py-4 text-sm">
              <span className="text-emerald-600">
                {numberFormatter.format(row.passed)}
              </span>
              {" / "}
              <span className="text-red-600">
                {numberFormatter.format(row.failed)}
              </span>
            </td>
            <td className="px-4 py-4 text-sm text-amber-600">
              {numberFormatter.format(row.pending)}
            </td>
            <td className="px-4 py-4 text-sm font-semibold">{row.risk}</td>
            <td className="px-4 py-4 text-sm">
              {row.certificateEligible ? "Eligible" : "Not Yet"}
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "certificate") {
    return (
      <Table
        minWidth="min-w-180"
        headings={["Certificate No", "Student", "Course", "Issue Date"]}
      >
        {(rows as AdminReportsPayload["rows"]["certificates"]).map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-4 text-sm font-semibold">
              {row.certificateNumber}
            </td>
            <td className="px-4 py-4 text-sm">{row.student}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">
              {formatDate(row.issueDate, localeTag)}
            </td>
          </tr>
        ))}
      </Table>
    );
  }

  return (
    <Table
      minWidth="min-w-195"
      headings={["User", "Action", "Entity", "Entity ID", "Date"]}
    >
      {(rows as AdminReportsPayload["rows"]["audit"]).map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-4 text-sm font-semibold">{row.user}</td>
          <td className="px-4 py-4 text-sm">{row.action}</td>
          <td className="px-4 py-4 text-sm">{row.entity}</td>
          <td className="px-4 py-4 text-sm">{row.entityId}</td>
          <td className="px-4 py-4 text-sm">
            {formatDate(row.date, localeTag)}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function Table({
  headings,
  minWidth,
  children,
}: {
  headings: string[];
  minWidth: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${minWidth}`}>
        <thead className="border-b border-border bg-muted/70">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
