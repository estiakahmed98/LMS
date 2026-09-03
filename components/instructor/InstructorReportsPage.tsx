"use client";

import type {
  AdminAssessmentReportRow,
  AdminCourseReportRow,
  AdminMarksheetRow,
  AdminMcqResultRow,
  AdminReportType,
} from "@/lib/admin-report-types";
import type { InstructorReportsPayload } from "@/lib/instructor-report-types";
import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LoaderCircle,
  RotateCcw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 25;

const reportTypes: { key: AdminReportType; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "course", label: "Course Reports" },
  { key: "assessment", label: "Assessment Reports" },
  { key: "marksheet", label: "Marksheets" },
  { key: "student", label: "Student Progress" },
  { key: "mcq", label: "MCQ Results" },
  { key: "certificate", label: "Certificates" },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resultTone(passed: boolean | null) {
  if (passed === true) return "bg-emerald-50 text-emerald-700";
  if (passed === false) return "bg-red-50 text-red-700";
  return "bg-muted text-muted-foreground";
}

function typeTone(type: string) {
  if (type === "MCQ") return "bg-blue-50 text-blue-700";
  if (type === "WRITTEN") return "bg-purple-50 text-purple-700";
  if (type === "PRACTICAL") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

export default function InstructorReportsPage() {
  const [data, setData] = useState<InstructorReportsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState("all");
  const [assessmentType, setAssessmentType] = useState("all");
  const [activeReport, setActiveReport] = useState<AdminReportType>("overview");
  const [page, setPage] = useState(1);
  const [loadedQueryKey, setLoadedQueryKey] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const queryKey = `${activeReport}:${courseId}:${assessmentType}:${page}`;

  const loadReports = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const requestedQueryKey = queryKey;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        report: activeReport,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (courseId !== "all") params.set("courseId", courseId);
      if (activeReport === "assessment" && assessmentType !== "all") {
        params.set("assessmentType", assessmentType);
      }
      const response = await fetch(`/api/instructor/reports?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as InstructorReportsPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load reports.");
      }
      if (sequence !== requestSequence.current) return;
      setData(payload);
      setLoadedQueryKey(requestedQueryKey);
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      setData(null);
      setLoadedQueryKey(null);
      setError(caught instanceof Error ? caught.message : "Failed to load reports.");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [activeReport, assessmentType, courseId, page, queryKey]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (data && page > data.pagination.totalPages) {
      setPage(data.pagination.totalPages);
    }
  }, [data, page]);

  const rows = data?.rows ?? [];
  const pagination = data?.pagination ?? { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };
  const reportsPending = loading || loadedQueryKey !== queryKey;

  function exportCsv() {
    const params = new URLSearchParams({ report: activeReport });
    if (courseId !== "all") params.set("courseId", courseId);
    window.location.assign(`/api/instructor/reports/export?${params.toString()}`);
  }

  const stats = data?.stats ?? {
    totalStudents: 0,
    totalAssessments: 0,
    totalSubmissions: 0,
    totalCertificates: 0,
  };

  return (
    <div className="space-y-6 p-2 md:p-4">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <BarChart3 className="h-4 w-4" />
              Reports
            </div>
            <h1 className="mt-1 text-2xl font-bold text-card-foreground">
              {reportTypes.find((item) => item.key === activeReport)?.label}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              All reports are limited to courses assigned to you.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadReports()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {reportTypes.map((report) => (
            <button
              key={report.key}
              type="button"
              onClick={() => { setActiveReport(report.key); setPage(1); }}
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

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_160px_160px_160px]">
          <select
            value={courseId}
            onChange={(event) => { setCourseId(event.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
          >
            <option value="all">All assigned courses</option>
            {(data?.courses ?? []).map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <select
            value={assessmentType}
            onChange={(event) => { setAssessmentType(event.target.value); setPage(1); }}
            disabled={activeReport !== "assessment"}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm disabled:opacity-50"
          >
            <option value="all">All assessment types</option>
            <option value="MCQ">MCQ</option>
            <option value="WRITTEN">Written</option>
            <option value="PRACTICAL">Lab</option>
          </select>
          <Summary label="Students" value={String(stats.totalStudents)} icon={Users} />
          <Summary label="Assessments" value={String(stats.totalAssessments)} icon={ClipboardCheck} />
          <Summary label="Certificates" value={String(stats.totalCertificates)} icon={Award} />
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-card-foreground">
            {reportTypes.find((item) => item.key === activeReport)?.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {pagination.total.toLocaleString()} record{pagination.total === 1 ? "" : "s"} in the latest {data?.range.years ?? 10} years. Newest records appear first.
          </p>
        </div>

        {reportsPending ? (
          <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Loading reports...
          </div>
        ) : rows.length === 0 ? (
          <div className="min-h-60 p-6 text-sm text-muted-foreground">
            No records found for the selected filters.
          </div>
        ) : (
          <ReportTable activeReport={activeReport} rows={rows} />
        )}
        {!reportsPending && pagination.totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={pagination.page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="min-w-24 text-center text-xs font-medium text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={pagination.page >= pagination.totalPages} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function ReportTable({
  activeReport,
  rows,
}: {
  activeReport: AdminReportType;
  rows: unknown[];
}) {
  if (activeReport === "overview" || activeReport === "course") {
    return (
      <Table headings={["Course", "Students", "Assessments", "Completed", "Avg Progress", "Pass Rate"]}>
        {(rows as AdminCourseReportRow[]).map((row) => (
          <tr key={row.courseId}>
            <td className="px-4 py-4 text-sm font-semibold">{row.course}</td>
            <td className="px-4 py-4 text-sm">{row.students}</td>
            <td className="px-4 py-4 text-sm">{row.assessments}</td>
            <td className="px-4 py-4 text-sm">{row.completed}</td>
            <td className="px-4 py-4 text-sm">{row.avgProgress}%</td>
            <td className="px-4 py-4 text-sm font-semibold text-emerald-600">{row.passRate}%</td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "assessment") {
    return (
      <Table headings={["Assessment", "Course", "Type", "Marks", "Submissions", "Pending", "Avg Score", "Pass Rate"]}>
        {(rows as AdminAssessmentReportRow[]).map((row) => (
          <tr key={row.id}>
            <td className="px-4 py-4 text-sm font-semibold">{row.assessment}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${typeTone(row.type)}`}>{row.type}</span>
            </td>
            <td className="px-4 py-4 text-sm">{row.totalMarks}/{row.passingMarks}</td>
            <td className="px-4 py-4 text-sm">{row.submissions}</td>
            <td className="px-4 py-4 text-sm text-amber-600">{row.pending}</td>
            <td className="px-4 py-4 text-sm">{row.avgScore}</td>
            <td className="px-4 py-4 text-sm font-semibold text-emerald-600">{row.passRate}%</td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "student") {
    return (
      <Table headings={["Student", "Course", "Progress", "Submissions", "Status", "Certificate"]}>
        {(rows as import("@/lib/admin-report-types").AdminStudentReportRow[]).map((row) => (
          <tr key={`${row.student}-${row.course}`}>
            <td className="px-4 py-4 text-sm font-semibold">{row.student}</td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">{row.progress}%</td>
            <td className="px-4 py-4 text-sm">{row.submissions}</td>
            <td className="px-4 py-4 text-sm">{row.status}</td>
            <td className="px-4 py-4 text-sm">{row.certificateEligible ? "Eligible" : "Not Yet"}</td>
          </tr>
        ))}
      </Table>
    );
  }

  if (activeReport === "marksheet") {
    return (
      <Table headings={["Student", "Course", "Assessments", "Total", "Percent", "Passed", "Pending", "Progress", "Status", "Marksheet"]}>
        {(rows as AdminMarksheetRow[]).map((row) => (
          <tr key={`${row.studentId}-${row.courseId}`}>
            <td className="px-4 py-4 text-sm">
              <p className="font-semibold">{row.student}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </td>
            <td className="px-4 py-4 text-sm">{row.course}</td>
            <td className="px-4 py-4 text-sm">{row.gradedCount}/{row.assessmentCount} graded</td>
            <td className="px-4 py-4 text-sm">{row.obtainedMarks}/{row.totalMarks}</td>
            <td className="px-4 py-4 text-sm">{row.scorePercent === null ? "-" : `${row.scorePercent}%`}</td>
            <td className="px-4 py-4 text-sm text-emerald-600">{row.passedCount}</td>
            <td className="px-4 py-4 text-sm text-amber-600">{row.pendingCount}</td>
            <td className="px-4 py-4 text-sm">{row.courseProgress}%</td>
            <td className="px-4 py-4 text-sm">{row.status}</td>
            <td className="px-4 py-4">
              <Link
                href={`/instructor/reports/marksheets/${row.courseId}/${row.studentId}`}
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

  if (activeReport === "mcq") {
    return (
      <Table headings={["Student", "Assessment", "Course", "Score", "Percent", "Correct", "Answered", "Result", "Submitted", "Answer Sheet"]}>
        {(rows as AdminMcqResultRow[]).map((row) => (
          <McqRow key={row.id} row={row} />
        ))}
      </Table>
    );
  }

  return (
    <Table headings={["Certificate No", "Student", "Course", "Issue Date"]}>
      {(rows as import("@/lib/admin-report-types").AdminCertificateReportRow[]).map((row) => (
        <tr key={row.id}>
          <td className="px-4 py-4 text-sm font-semibold">{row.certificateNumber}</td>
          <td className="px-4 py-4 text-sm">{row.student}</td>
          <td className="px-4 py-4 text-sm">{row.course}</td>
          <td className="px-4 py-4 text-sm">{formatDate(row.issueDate)}</td>
        </tr>
      ))}
    </Table>
  );
}

function Table({
  headings,
  children,
}: {
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px]">
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

function McqRow({ row }: { row: AdminMcqResultRow }) {
  return (
    <tr>
      <td className="px-4 py-4 text-sm">
        <p className="font-semibold">{row.student}</p>
        <p className="text-xs text-muted-foreground">{row.email}</p>
      </td>
      <td className="px-4 py-4 text-sm font-medium">{row.assessment}</td>
      <td className="px-4 py-4 text-sm">{row.course}</td>
      <td className="px-4 py-4 text-sm">
        {row.obtainedMarks === null ? "Pending" : `${row.obtainedMarks}/${row.totalMarks}`}
      </td>
      <td className="px-4 py-4 text-sm">
        {row.scorePercent === null ? "-" : `${row.scorePercent}%`}
      </td>
      <td className="px-4 py-4 text-sm">{row.correct}/{row.questionCount}</td>
      <td className="px-4 py-4 text-sm">{row.answered}/{row.questionCount}</td>
      <td className="px-4 py-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${resultTone(row.passed)}`}>
          {row.passed === null ? row.status : row.passed ? "Passed" : "Failed"}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-muted-foreground">
        {formatDate(row.submittedAt)}
      </td>
      <td className="px-4 py-4">
        <Link
          href={`/instructor/reports/mcq-results/${row.id}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
        >
          <Eye className="h-3.5 w-3.5" />
          Open
        </Link>
      </td>
    </tr>
  );
}
