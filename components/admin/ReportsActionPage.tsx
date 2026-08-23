"use client";

import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
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
import { COLOR_THEME_META, getStoredColorTheme } from "@/lib/color-theme";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";

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

async function loadCroppedLogo(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;

  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const context = source.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return null;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const isVisible =
        pixels[offset + 3] > 12 &&
        (pixels[offset] < 245 ||
          pixels[offset + 1] < 245 ||
          pixels[offset + 2] < 245);
      if (!isVisible) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return null;
  const padding = 4;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);
  const croppedWidth = right - left + 1;
  const croppedHeight = bottom - top + 1;
  const cropped = document.createElement("canvas");
  cropped.width = croppedWidth;
  cropped.height = croppedHeight;
  cropped
    .getContext("2d")
    ?.drawImage(
      source,
      left,
      top,
      croppedWidth,
      croppedHeight,
      0,
      0,
      croppedWidth,
      croppedHeight,
    );

  return {
    dataUrl: cropped.toDataURL("image/png"),
    width: croppedWidth,
    height: croppedHeight,
  };
}

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
  const [activeReport, setActiveReport] = useState<AdminReportType>("overview");
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedAssessmentType, setSelectedAssessmentType] = useState("all");
  const [notice, setNotice] = useState<Notice>({ key: "ready" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [studentSearch, setStudentSearch] = useState("");
  const [exportingStudentPdf, setExportingStudentPdf] = useState(false);

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
            selectedCourseId === "all" || row.courseId === selectedCourseId,
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
            selectedCourseId === "all" || row.courseId === selectedCourseId,
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
  const studentDirectoryRows = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return (data?.rows.studentDirectory ?? []).filter((row) => {
      const courseMatch =
        selectedCourseId === "all" ||
        row.perCourse.some((course) => course.courseId === selectedCourseId);
      const searchMatch =
        !query ||
        row.student.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.courses.some((course) => course.toLowerCase().includes(query));
      return courseMatch && searchMatch;
    });
  }, [data?.rows.studentDirectory, selectedCourseId, studentSearch]);

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

  function changeAssessmentType(value: string) {
    setSelectedAssessmentType(value);
    setPage(1);
  }

  async function exportStudentPerformancePdf() {
    if (!canExport || studentDirectoryRows.length === 0) return;
    setExportingStudentPdf(true);
    setError(null);

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const theme = COLOR_THEME_META[getStoredColorTheme()];
      const primary = theme.primary
        .replace("#", "")
        .match(/.{2}/g)
        ?.map((part) => Number.parseInt(part, 16)) as
        | [number, number, number]
        | undefined;
      const brandColor: [number, number, number] = primary ?? [216, 32, 40];
      const generatedAt = new Date();
      const generatedLabel = new Intl.DateTimeFormat(localeTag, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(generatedAt);
      const scopeLabel =
        selectedCourseId === "all"
          ? "All courses and batches"
          : (data?.courses.find((course) => course.id === selectedCourseId)
              ?.title ?? "Selected course or batch");
      const atRisk = studentDirectoryRows.filter(
        (row) => row.risk === "At Risk",
      ).length;
      const averageProgress = Math.round(
        studentDirectoryRows.reduce((sum, row) => sum + row.avgProgress, 0) /
          studentDirectoryRows.length,
      );
      const averageScoreRows = studentDirectoryRows.filter(
        (row) => row.scorePercent !== null,
      );
      const averageScore = averageScoreRows.length
        ? Math.round(
            averageScoreRows.reduce(
              (sum, row) => sum + (row.scorePercent ?? 0),
              0,
            ) / averageScoreRows.length,
          )
        : 0;
      const totalPagesExpression = "{total_pages_count_string}";

      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 7, "F");

      try {
        const logo = await loadCroppedLogo(theme.logo);
        if (logo) {
          const logoScale = Math.min(32 / logo.width, 16 / logo.height);
          const logoWidth = logo.width * logoScale;
          const logoHeight = logo.height * logoScale;
          doc.addImage(
            logo.dataUrl,
            "PNG",
            14,
            11 + (16 - logoHeight) / 2,
            logoWidth,
            logoHeight,
            undefined,
            "FAST",
          );
        }
      } catch {
        // The report remains usable if a custom logo cannot be loaded.
      }

      doc.setTextColor(17, 24, 39);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(19);
      doc.text("Student Performance Report", 50, 17);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("BOED Learning Management System", 50, 22);
      doc.text(`Scope: ${scopeLabel}`, 50, 27);
      doc.text(`Generated: ${generatedLabel}`, pageWidth - 14, 17, {
        align: "right",
      });
      doc.text(`Records: ${studentDirectoryRows.length}`, pageWidth - 14, 22, {
        align: "right",
      });
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 31, pageWidth - 14, 31);

      const summaryValues = [
        { label: "TOTAL STUDENTS", value: String(studentDirectoryRows.length) },
        { label: "AVERAGE PROGRESS", value: `${averageProgress}%` },
        { label: "AVERAGE SCORE", value: `${averageScore}%` },
        { label: "AT-RISK STUDENTS", value: String(atRisk) },
      ];
      const summaryGap = 4;
      const summaryWidth = (pageWidth - 28 - summaryGap * 3) / 4;
      summaryValues.forEach((metric, index) => {
        const x = 14 + index * (summaryWidth + summaryGap);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, 35, summaryWidth, 17, 2, 2, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(metric.label, x + 4, 41);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(
          index === 3 && atRisk > 0 ? 220 : brandColor[0],
          index === 3 && atRisk > 0 ? 38 : brandColor[1],
          index === 3 && atRisk > 0 ? 38 : brandColor[2],
        );
        doc.text(metric.value, x + 4, 48);
      });

      autoTable(doc, {
        startY: 57,
        margin: { top: 25, right: 14, bottom: 15, left: 14 },
        head: [
          [
            "#",
            "Student",
            "Courses",
            "Avg. Progress",
            "Avg. Score",
            "Passed",
            "Failed",
            "Pending",
            "Risk Status",
            "Certificates",
          ],
        ],
        body: studentDirectoryRows.map((row, index) => [
          index + 1,
          `${row.student}\n${row.email}`,
          row.courses.join(", "),
          `${row.avgProgress}%`,
          row.scorePercent === null ? "—" : `${row.scorePercent}%`,
          row.passed,
          row.failed,
          row.pending,
          row.risk,
          row.certificatesEarned,
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 7.5,
          cellPadding: 2.4,
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          textColor: [51, 65, 85],
          valign: "middle",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: brandColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
          minCellHeight: 9,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 9, halign: "center" },
          1: { cellWidth: 48 },
          2: { cellWidth: 60 },
          3: { cellWidth: 21, halign: "center", fontStyle: "bold" },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 17, halign: "center" },
          6: { cellWidth: 17, halign: "center" },
          7: { cellWidth: 18, halign: "center" },
          8: { cellWidth: 28, halign: "center", fontStyle: "bold" },
          9: { cellWidth: 29, halign: "center" },
        },
        didParseCell: (hookData) => {
          if (hookData.section !== "body") return;
          if (hookData.column.index === 5)
            hookData.cell.styles.textColor = [5, 150, 105];
          if (hookData.column.index === 6)
            hookData.cell.styles.textColor = [220, 38, 38];
          if (hookData.column.index === 7)
            hookData.cell.styles.textColor = [217, 119, 6];
          if (hookData.column.index === 8) {
            hookData.cell.styles.textColor =
              String(hookData.cell.raw) === "At Risk"
                ? [220, 38, 38]
                : [5, 150, 105];
          }
          if (hookData.column.index === 9 && hookData.cell.raw === "Eligible") {
            hookData.cell.styles.textColor = [5, 150, 105];
            hookData.cell.styles.fontStyle = "bold";
          }
        },
        didDrawPage: (hookData) => {
          if (hookData.pageNumber > 1) {
            doc.setFillColor(...brandColor);
            doc.rect(0, 0, pageWidth, 5, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(17, 24, 39);
            doc.text("Student Performance Report", 14, 16);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(scopeLabel, pageWidth - 14, 16, { align: "right" });
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 20, pageWidth - 14, 20);
          }

          doc.setDrawColor(226, 232, 240);
          doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(
            "BOED LMS • Confidential academic report",
            14,
            pageHeight - 6,
          );
          doc.text(
            `Page ${hookData.pageNumber} of ${totalPagesExpression}`,
            pageWidth - 14,
            pageHeight - 6,
            { align: "right" },
          );
        },
      });

      doc.putTotalPages(totalPagesExpression);
      const safeScope = scopeLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45);
      doc.save(
        `student-performance-${safeScope || "all-courses"}-${generatedAt
          .toISOString()
          .slice(0, 10)}.pdf`,
      );
      setNotice({
        key: "exported",
        report: "Student Performance Report",
        format: "PDF",
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to generate the student performance PDF.",
      );
    } finally {
      setExportingStudentPdf(false);
    }
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

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5 print:hidden">
          <div className="grid gap-3 lg:grid-cols-[160px_1fr_220px_auto]">
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">
                Individual reporting
              </p>
              <h2 className="mt-1 text-xl font-bold">
                Individual Student Reports
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                View a learner&apos;s complete course marksheet or open the
                print-ready version to save as PDF.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search student, email or course..."
                className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              {canExport ? (
                <button
                  type="button"
                  onClick={() => void exportStudentPerformancePdf()}
                  disabled={
                    loading ||
                    exportingStudentPdf ||
                    studentDirectoryRows.length === 0
                  }
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exportingStudentPdf ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {exportingStudentPdf
                    ? "Generating PDF..."
                    : "Export Performance PDF"}
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Loading student reports...
            </div>
          ) : studentDirectoryRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students matched the selected course and search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px]">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {[
                      "Student",
                      "Courses",
                      "Avg. Progress",
                      "Average Score",
                      "Passed / Failed",
                      "Pending",
                      "Risk",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {studentDirectoryRows.map((row) => {
                    const reportHref = `/admin/reports/students/${row.studentId}`;
                    return (
                      <tr key={row.studentId} className="hover:bg-muted/30">
                        <td className="px-4 py-4 text-sm">
                          <p className="font-semibold">{row.student}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.email}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className="font-semibold">{row.courseCount}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            {row.courseCount === 1 ? "course" : "courses"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold">
                          {numberFormatter.format(row.avgProgress)}%
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {row.scorePercent === null
                            ? "-"
                            : `${numberFormatter.format(row.scorePercent)}%`}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className="font-semibold text-emerald-600">
                            {numberFormatter.format(row.passed)}
                          </span>
                          {" / "}
                          <span className="font-semibold text-red-600">
                            {numberFormatter.format(row.failed)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-amber-600">
                          {numberFormatter.format(row.pending)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              row.risk === "At Risk"
                                ? "bg-red-500/10 text-red-600"
                                : row.risk === "Watch"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : row.risk === "Not Started"
                                    ? "bg-slate-500/10 text-slate-600"
                                    : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {row.risk}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={reportHref}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                            {canExport ? (
                              <Link
                                href={`${reportHref}?print=1`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                              >
                                <Download className="h-3.5 w-3.5" />
                                PDF
                              </Link>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
