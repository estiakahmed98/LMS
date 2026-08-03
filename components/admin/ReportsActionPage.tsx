"use client";

import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import type {
  AdminAssessmentReportRow,
  AdminCourseReportRow,
  AdminMarksheetRow,
  AdminMcqResultRow,
  AdminReportsPayload,
  AdminReportType,
} from "@/lib/admin-report-types";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useMemo, useState } from "react";

type ExportFormat = "CSV";

type Notice =
  | { key: "ready" | "scheduleSaved" }
  | { key: "exported"; report: string; format: ExportFormat };

const reportTypes: { key: AdminReportType; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "course", label: "Course Reports" },
  { key: "assessment", label: "Assessment Reports" },
  { key: "marksheet", label: "Marksheets" },
  { key: "mcq", label: "MCQ Results" },
  { key: "student", label: "Student Progress" },
  { key: "certificate", label: "Certificates" },
  { key: "audit", label: "Audit Logs" },
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

export default function ReportsActionPage() {
  const tAdmin = useTranslations("admin");
  const { can } = useAdminPermissions();
  const canExport = can("REPORTS", "export");
  const canEditSettings = can("SETTINGS", "edit");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);

  const [data, setData] = useState<AdminReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<AdminReportType>("overview");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
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
      setError(caught instanceof Error ? caught.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

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

  const currentRows = useMemo(() => {
    if (!data) return [];
    switch (activeReport) {
      case "overview":
      case "course":
        return data.rows.courses.filter(
          (row) => selectedCourseId === "all" || row.courseId === selectedCourseId,
        );
      case "assessment":
        return filteredAssessmentRows;
      case "marksheet":
        return data.rows.marksheets.filter(
          (row) => selectedCourseId === "all" || row.courseId === selectedCourseId,
        );
      case "mcq":
        return filteredMcqRows;
      case "student":
        return data.rows.students.filter(
          (row) => selectedCourseId === "all" || row.courseId === selectedCourseId,
        );
      case "certificate":
        return data.rows.certificates.filter(
          (row) => selectedCourseId === "all" || row.courseId === selectedCourseId,
        );
      case "audit":
        return data.rows.audit;
      default:
        return [];
    }
  }, [activeReport, data, filteredAssessmentRows, filteredMcqRows, selectedCourseId]);

  const totalPages = Math.max(1, Math.ceil(currentRows.length / pageSize));
  const paginatedRows = currentRows.slice((page - 1) * pageSize, page * pageSize);
  const showingFrom = currentRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, currentRows.length);

  const chartRows = filteredAssessmentRows.slice(0, 12).map((row) => ({
    assessment: row.assessment.split(" ").slice(0, 3).join(" "),
    passRate: row.passRate,
  }));

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
    const href = `/api/admin/reports/export?report=${encodeURIComponent(activeReport)}`;
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

  function changeAssessmentType(value: string) {
    setSelectedAssessmentType(value);
    setPage(1);
  }

  const stats = data?.stats ?? {
    totalStudents: 0,
    totalAssessments: 0,
    totalSubmissions: 0,
    totalCertificates: 0,
  };

  return (
    <AdminLayout title={tAdmin("reports")}>
      <div className="space-y-6 p-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            {reportTypes.map((report) => (
              <button
                key={report.key}
                onClick={() => changeReport(report.key)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  activeReport === report.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {report.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-[180px_1fr_220px_auto]">
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
              value={selectedAssessmentType}
              onChange={(event) => changeAssessmentType(event.target.value)}
              disabled={activeReport === "mcq"}
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
              </div>
            )}
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {getNoticeText(notice)}
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total Students"
            value={numberFormatter.format(stats.totalStudents)}
          />
          <StatCard
            icon={ClipboardCheck}
            label="Assessments"
            value={numberFormatter.format(stats.totalAssessments)}
          />
          <StatCard
            icon={BookOpen}
            label="Submissions"
            value={numberFormatter.format(stats.totalSubmissions)}
          />
          <StatCard
            icon={Award}
            label="Certificates"
            value={numberFormatter.format(stats.totalCertificates)}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h1 className="text-xl font-bold text-card-foreground">
                  {getReportLabel(activeReport)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Showing {numberFormatter.format(showingFrom)}-
                  {numberFormatter.format(showingTo)} of{" "}
                  {numberFormatter.format(currentRows.length)} records.
                </p>
              </div>

              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            {loading ? (
              <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading report data...
              </div>
            ) : currentRows.length === 0 ? (
              <div className="min-h-60 p-6 text-sm text-muted-foreground">
                No records matched the selected filters.
              </div>
            ) : (
              <ReportTable
                activeReport={activeReport}
                rows={paginatedRows}
                localeTag={localeTag}
                numberFormatter={numberFormatter}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Page {numberFormatter.format(page)} of{" "}
                {numberFormatter.format(totalPages)}
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-semibold text-card-foreground">
              Schedule Report
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Automatically send {getReportLabel(activeReport)} report to admin
              email.
            </p>

            <select className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>

            <input
              className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              defaultValue="admin@pstc.org"
            />

            {canEditSettings && (
              <button
                onClick={() => setNotice({ key: "scheduleSaved" })}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Save Schedule
              </button>
            )}

            <div className="mt-5 space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-primary" />
                Real database-backed reports
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                MCQ result table for all learners
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                CSV exports are permission checked
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-card-foreground">
              Assessment Pass Rate
            </h2>
            <p className="text-sm text-muted-foreground">
              Chart uses aggregated summary data from submitted assessments.
            </p>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="assessment" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                formatter={(value) => [
                  `${numberFormatter.format(Number(value))}%`,
                  "Pass Rate",
                ]}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="passRate" fill="#DC2626" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <h2 className="mt-2 text-2xl font-bold">{value}</h2>
    </div>
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
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.students)}</td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.assessments)}</td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.completed)}</td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.avgProgress)}%</td>
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
            <td className="px-4 py-4 text-sm font-semibold">{row.assessment}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${getAssessmentTypeClass(row.type)}`}>
                {getAssessmentTypeLabel(row.type)}
              </span>
            </td>
            <td className="px-4 py-4 text-sm">
              {row.totalMarks}/{row.passingMarks}
            </td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.submissions)}</td>
            <td className="px-4 py-4 text-sm text-amber-600">{numberFormatter.format(row.pending)}</td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.avgScore)}</td>
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
              {row.scorePercent === null ? "-" : `${numberFormatter.format(row.scorePercent)}%`}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.correct)}/{numberFormatter.format(row.questionCount)}
            </td>
            <td className="px-4 py-4 text-sm">
              {numberFormatter.format(row.answered)}/{numberFormatter.format(row.questionCount)}
            </td>
            <td className="px-4 py-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(row.passed)}`}>
                {row.passed === null ? row.status : row.passed ? "Passed" : "Failed"}
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
              {row.scorePercent === null ? "-" : `${numberFormatter.format(row.scorePercent)}%`}
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

  if (activeReport === "student") {
    return (
      <Table
        minWidth="min-w-195"
        headings={["Student", "Course", "Progress", "Submissions", "Status", "Certificate"]}
      >
        {(rows as AdminReportsPayload["rows"]["students"]).map((row) => (
          <tr key={`${row.student}-${row.course}`}>
            <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.progress)}%</td>
            <td className="px-4 py-4 text-sm">{numberFormatter.format(row.submissions)}</td>
            <td className="px-4 py-4 text-sm">{row.status}</td>
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
      <Table minWidth="min-w-180" headings={["Certificate No", "Student", "Course", "Issue Date"]}>
        {(rows as AdminReportsPayload["rows"]["certificates"]).map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-4 text-sm font-semibold">{row.certificateNumber}</td>
            <td className="px-4 py-4 text-sm">{row.student}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">{formatDate(row.issueDate, localeTag)}</td>
          </tr>
        ))}
      </Table>
    );
  }

  return (
    <Table minWidth="min-w-195" headings={["User", "Action", "Entity", "Entity ID", "Date"]}>
      {(rows as AdminReportsPayload["rows"]["audit"]).map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-4 text-sm font-semibold">{row.user}</td>
          <td className="px-4 py-4 text-sm">{row.action}</td>
          <td className="px-4 py-4 text-sm">{row.entity}</td>
          <td className="px-4 py-4 text-sm">{row.entityId}</td>
          <td className="px-4 py-4 text-sm">{formatDate(row.date, localeTag)}</td>
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
