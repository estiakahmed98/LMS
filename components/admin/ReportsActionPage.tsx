"use client";

import AdminLayout from "@/components/AdminLayout";
import {
  mockAssessments,
  mockAuditLogs,
  mockCertificates,
  mockCourses,
  mockEnrollments,
  mockSubmissions,
  mockUsers,
  type AssessmentType,
} from "@/lib/mock-data";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";

type ReportType =
  | "overview"
  | "course"
  | "assessment"
  | "student"
  | "certificate"
  | "audit";

type ExportFormat = "PDF" | "Excel" | "CSV";

type Notice =
  | { key: "ready" | "scheduleSaved" }
  | { key: "exported"; report: string; format: ExportFormat }
  | { key: "exportQueued"; report: string; format: ExportFormat };

const reportTypes: { key: ReportType; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "course", label: "Course Reports" },
  { key: "assessment", label: "Assessment Reports" },
  { key: "student", label: "Student Progress" },
  { key: "certificate", label: "Certificates" },
  { key: "audit", label: "Audit Logs" },
];

function getAssessmentTypeLabel(type: AssessmentType) {
  if (type === "PRACTICAL") return "Lab";
  if (type === "WRITTEN") return "Written";
  if (type === "MCQ") return "MCQ";
  return "Mixed";
}

function getAssessmentTypeClass(type: AssessmentType) {
  switch (type) {
    case "MCQ":
      return "bg-blue-50 text-blue-700";
    case "WRITTEN":
      return "bg-purple-50 text-purple-700";
    case "PRACTICAL":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

function getCourseTitle(courseId: string) {
  return (
    mockCourses.find((course) => course.id === courseId)?.title ?? courseId
  );
}

function getUserName(userId: string) {
  return mockUsers.find((user) => user.id === userId)?.name ?? userId;
}

export default function ReportsActionPage() {
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);

  const [activeReport, setActiveReport] = useState<ReportType>("overview");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all");
  const [notice, setNotice] = useState<Notice>({ key: "ready" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const approvedEnrollments = useMemo(
    () => mockEnrollments.filter((item) => item.status === "APPROVED"),
    [],
  );

  const filteredAssessments = useMemo(() => {
    return mockAssessments.filter((assessment) => {
      const courseMatch =
        selectedCourseId === "all" || assessment.courseId === selectedCourseId;

      const typeMatch =
        selectedAssessmentType === "all" ||
        assessment.type === selectedAssessmentType;

      return courseMatch && typeMatch;
    });
  }, [selectedCourseId, selectedAssessmentType]);

  const courseRows = useMemo(() => {
    return mockCourses
      .filter(
        (course) =>
          selectedCourseId === "all" || course.id === selectedCourseId,
      )
      .map((course) => {
        const enrollments = mockEnrollments.filter(
          (item) => item.courseId === course.id && item.status === "APPROVED",
        );

        const assessments = mockAssessments.filter(
          (item) => item.courseId === course.id,
        );

        const completed = enrollments.filter(
          (item) => item.progress >= 100,
        ).length;

        const avgProgress =
          enrollments.length > 0
            ? Math.round(
                enrollments.reduce((total, item) => total + item.progress, 0) /
                  enrollments.length,
              )
            : 0;

        return {
          course: course.title,
          students: enrollments.length,
          assessments: assessments.length,
          completed,
          avgProgress,
          passRate: 70 + (course.id.length % 20),
        };
      });
  }, [selectedCourseId]);

  const assessmentRows = useMemo(() => {
    return filteredAssessments.map((assessment) => {
      const submissions = mockSubmissions.filter(
        (item) => item.assessmentId === assessment.id,
      );

      const graded = submissions.filter(
        (item) => item.status === "GRADED" || item.status === "REVIEWED",
      );

      const avgScore =
        graded.length > 0
          ? Math.round(
              graded.reduce(
                (total, item) => total + (item.obtainedMarks ?? 0),
                0,
              ) / graded.length,
            )
          : 0;

      const passed = graded.filter(
        (item) => (item.obtainedMarks ?? 0) >= assessment.passingMarks,
      ).length;

      const passRate =
        graded.length > 0 ? Math.round((passed / graded.length) * 100) : 0;

      return {
        id: assessment.id,
        assessment: assessment.title,
        course: getCourseTitle(assessment.courseId),
        type: assessment.type,
        totalMarks: assessment.totalMarks,
        passingMarks: assessment.passingMarks,
        submissions: submissions.length,
        pending: submissions.filter(
          (item) => item.status === "SUBMITTED" || item.status === "GRADING",
        ).length,
        avgScore,
        passRate,
      };
    });
  }, [filteredAssessments]);

  const studentRows = useMemo(() => {
    return approvedEnrollments
      .filter(
        (enrollment) =>
          selectedCourseId === "all" ||
          enrollment.courseId === selectedCourseId,
      )
      .map((enrollment) => {
        const userSubmissions = mockSubmissions.filter(
          (item) => item.userId === enrollment.userId,
        );

        return {
          student: getUserName(enrollment.userId),
          course: getCourseTitle(enrollment.courseId),
          progress: enrollment.progress,
          submissions: userSubmissions.length,
          status: enrollment.progress >= 100 ? "Completed" : "In Progress",
          certificateEligible: enrollment.progress >= 100,
        };
      });
  }, [approvedEnrollments, selectedCourseId]);

  const certificateRows = useMemo(() => {
    return mockCertificates
      .filter(
        (certificate) =>
          selectedCourseId === "all" ||
          certificate.courseId === selectedCourseId,
      )
      .map((certificate) => ({
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        student: getUserName(certificate.userId),
        course: getCourseTitle(certificate.courseId),
        issueDate: certificate.issueDate.toLocaleDateString(localeTag),
      }));
  }, [selectedCourseId, localeTag]);

  const auditRows = useMemo(() => {
    return mockAuditLogs.map((log) => ({
      id: log.id,
      user: getUserName(log.userId),
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      date: log.createdAt.toLocaleDateString(localeTag),
    }));
  }, [localeTag]);

  const currentRows = useMemo(() => {
    switch (activeReport) {
      case "overview":
      case "course":
        return courseRows;
      case "assessment":
        return assessmentRows;
      case "student":
        return studentRows;
      case "certificate":
        return certificateRows;
      case "audit":
        return auditRows;
      default:
        return [];
    }
  }, [
    activeReport,
    courseRows,
    assessmentRows,
    studentRows,
    certificateRows,
    auditRows,
  ]);

  const totalPages = Math.max(1, Math.ceil(currentRows.length / pageSize));

  const paginatedRows = currentRows.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const showingFrom = currentRows.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, currentRows.length);

  const chartRows = assessmentRows.slice(0, 12).map((row) => ({
    assessment: row.assessment.split(" ").slice(0, 3).join(" "),
    passRate: row.passRate,
  }));

  const totalStudents = approvedEnrollments.length;
  const totalAssessments = mockAssessments.length;
  const totalSubmissions = mockSubmissions.length;
  const totalCertificates = mockCertificates.length;

  function getReportLabel(report: ReportType) {
    return reportTypes.find((item) => item.key === report)?.label ?? report;
  }

  function getNoticeText(value: Notice) {
    if (value.key === "exportQueued") {
      return `${value.report} ${value.format} export queued. Large reports will be generated in the background.`;
    }

    if (value.key === "exported") {
      return `${value.report} exported as ${value.format}.`;
    }

    if (value.key === "scheduleSaved") return "Report schedule saved.";
    return "Choose filters and generate your report.";
  }

  function exportReport(format: ExportFormat) {
    if (currentRows.length > 100) {
      setNotice({
        key: "exportQueued",
        report: getReportLabel(activeReport),
        format,
      });
      return;
    }

    setNotice({
      key: "exported",
      report: getReportLabel(activeReport),
      format,
    });
  }

  function changeReport(report: ReportType) {
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
            <input
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              type="date"
            />

            <select
              value={selectedCourseId}
              onChange={(event) => changeCourse(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Courses</option>
              {mockCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <select
              value={selectedAssessmentType}
              onChange={(event) => changeAssessmentType(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            >
              <option value="all">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="WRITTEN">Written</option>
              <option value="PRACTICAL">Lab</option>
            </select>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => exportReport("PDF")}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                PDF
              </button>

              <button
                onClick={() => exportReport("Excel")}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>

              <button
                onClick={() => exportReport("CSV")}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {getNoticeText(notice)}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Students</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="mt-2 text-2xl font-bold">
              {numberFormatter.format(totalStudents)}
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Assessments</p>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="mt-2 text-2xl font-bold">
              {numberFormatter.format(totalAssessments)}
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Submissions</p>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="mt-2 text-2xl font-bold">
              {numberFormatter.format(totalSubmissions)}
            </h2>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Certificates</p>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
            <h2 className="mt-2 text-2xl font-bold">
              {numberFormatter.format(totalCertificates)}
            </h2>
          </div>
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

            <div className="overflow-x-auto">
              {(activeReport === "overview" || activeReport === "course") && (
                <table className="w-full min-w-190">
                  <thead className="border-b border-border bg-muted/70">
                    <tr>
                      {[
                        "Course",
                        "Students",
                        "Assessments",
                        "Completed",
                        "Avg Progress",
                        "Pass Rate",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {(paginatedRows as typeof courseRows).map((row) => (
                      <tr key={row.course}>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {row.course}
                        </td>
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
                  </tbody>
                </table>
              )}

              {activeReport === "assessment" && (
                <table className="w-full min-w-225">
                  <thead className="border-b border-border bg-muted/70">
                    <tr>
                      {[
                        "Assessment",
                        "Course",
                        "Type",
                        "Marks",
                        "Submissions",
                        "Pending",
                        "Avg Score",
                        "Pass Rate",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {(paginatedRows as typeof assessmentRows).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {row.assessment}
                        </td>
                        <td className="px-4 py-4 text-sm">{row.course}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getAssessmentTypeClass(
                              row.type,
                            )}`}
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
                  </tbody>
                </table>
              )}

              {activeReport === "student" && (
                <table className="w-full min-w-195">
                  <thead className="border-b border-border bg-muted/70">
                    <tr>
                      {[
                        "Student",
                        "Course",
                        "Progress",
                        "Submissions",
                        "Status",
                        "Certificate",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {(paginatedRows as typeof studentRows).map((row) => (
                      <tr key={`${row.student}-${row.course}`}>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {row.student}
                        </td>
                        <td className="px-4 py-4 text-sm">{row.course}</td>
                        <td className="px-4 py-4 text-sm">
                          {numberFormatter.format(row.progress)}%
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {numberFormatter.format(row.submissions)}
                        </td>
                        <td className="px-4 py-4 text-sm">{row.status}</td>
                        <td className="px-4 py-4 text-sm">
                          {row.certificateEligible ? "Eligible" : "Not Yet"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReport === "certificate" && (
                <table className="w-full min-w-180">
                  <thead className="border-b border-border bg-muted/70">
                    <tr>
                      {[
                        "Certificate No",
                        "Student",
                        "Course",
                        "Issue Date",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {(paginatedRows as typeof certificateRows).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {row.certificateNumber}
                        </td>
                        <td className="px-4 py-4 text-sm">{row.student}</td>
                        <td className="px-4 py-4 text-sm">{row.course}</td>
                        <td className="px-4 py-4 text-sm">{row.issueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeReport === "audit" && (
                <table className="w-full min-w-195">
                  <thead className="border-b border-border bg-muted/70">
                    <tr>
                      {["User", "Action", "Entity", "Entity ID", "Date"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {(paginatedRows as typeof auditRows).map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {row.user}
                        </td>
                        <td className="px-4 py-4 text-sm">{row.action}</td>
                        <td className="px-4 py-4 text-sm">{row.entity}</td>
                        <td className="px-4 py-4 text-sm">{row.entityId}</td>
                        <td className="px-4 py-4 text-sm">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

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

            <button
              onClick={() => setNotice({ key: "scheduleSaved" })}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              Save Schedule
            </button>

            <div className="mt-5 space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="h-4 w-4 text-primary" />
                Server-side pagination ready
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                MCQ, Written and Lab reports
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Large exports run as background jobs
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
              Chart uses aggregated summary data, not all student rows.
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
