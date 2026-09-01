"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import type {
  AdminReportCourseOption,
  AdminStudentDirectoryListResult,
  AdminStudentDirectoryRow,
} from "@/lib/admin-report-types";
import { COLOR_THEME_META, getStoredColorTheme } from "@/lib/color-theme";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LoaderCircle,
  Search,
  Users,
} from "lucide-react";

const PAGE_SIZE = 25;

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
        (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245);
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
    ?.drawImage(source, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

  return {
    dataUrl: cropped.toDataURL("image/png"),
    width: croppedWidth,
    height: croppedHeight,
  };
}

function riskBadgeClass(risk: AdminStudentDirectoryRow["risk"]) {
  switch (risk) {
    case "At Risk":
      return "bg-red-500/10 text-red-600";
    case "Watch":
      return "bg-amber-500/10 text-amber-600";
    case "Not Started":
      return "bg-slate-500/10 text-slate-600";
    default:
      return "bg-emerald-500/10 text-emerald-600";
  }
}

export default function IndividualStudentReportsTab({
  localeTag,
}: {
  localeTag: string;
}) {
  const { can } = useAdminPermissions();
  const canExport = can("REPORTS", "export");
  const numberFormatter = new Intl.NumberFormat(localeTag);

  const [courses, setCourses] = useState<AdminReportCourseOption[]>([]);
  const [students, setStudents] = useState<AdminStudentDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("all");
  const [page, setPage] = useState(1);
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/courses", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load courses."))))
      .then((data) => {
        if (!cancelled) setCourses(data.courses ?? []);
      })
      .catch(() => {
        // Non-critical — the course filter simply stays empty (All Courses only).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [search, courseId]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (courseId !== "all") params.set("courseId", courseId);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const response = await fetch(`/api/admin/reports/students?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as AdminStudentDirectoryListResult & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to load student reports.");
      }
      setStudents(json.students);
      setTotal(json.total);
    } catch (caught) {
      setStudents([]);
      setTotal(0);
      setError(caught instanceof Error ? caught.message : "Failed to load student reports.");
    } finally {
      setLoading(false);
    }
  }, [search, courseId, page]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, total);

  const isFirstExport = useRef(true);

  async function exportStudentPerformancePdf() {
    if (!canExport || students.length === 0) return;
    setExportingPdf(true);
    setError(null);

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const theme = COLOR_THEME_META[getStoredColorTheme()];
      const primary = theme.primary
        .replace("#", "")
        .match(/.{2}/g)
        ?.map((part) => Number.parseInt(part, 16)) as [number, number, number] | undefined;
      const brandColor: [number, number, number] = primary ?? [216, 32, 40];
      const generatedAt = new Date();
      const generatedLabel = new Intl.DateTimeFormat(localeTag, {
        dateStyle: "long",
        timeStyle: "short",
      }).format(generatedAt);
      const scopeLabel =
        courseId === "all"
          ? "All courses and batches"
          : (courses.find((course) => course.id === courseId)?.title ?? "Selected course or batch");
      const atRisk = students.filter((row) => row.risk === "At Risk").length;
      const averageProgress = Math.round(
        students.reduce((sum, row) => sum + row.avgProgress, 0) / students.length,
      );
      const averageScoreRows = students.filter((row) => row.scorePercent !== null);
      const averageScore = averageScoreRows.length
        ? Math.round(
            averageScoreRows.reduce((sum, row) => sum + (row.scorePercent ?? 0), 0) /
              averageScoreRows.length,
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
      doc.text(`Generated: ${generatedLabel}`, pageWidth - 14, 17, { align: "right" });
      doc.text(`Records: ${students.length} (this page)`, pageWidth - 14, 22, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 31, pageWidth - 14, 31);

      const summaryValues = [
        { label: "STUDENTS (THIS PAGE)", value: String(students.length) },
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
        body: students.map((row, index) => [
          (page - 1) * PAGE_SIZE + index + 1,
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
          if (hookData.column.index === 5) hookData.cell.styles.textColor = [5, 150, 105];
          if (hookData.column.index === 6) hookData.cell.styles.textColor = [220, 38, 38];
          if (hookData.column.index === 7) hookData.cell.styles.textColor = [217, 119, 6];
          if (hookData.column.index === 8) {
            hookData.cell.styles.textColor =
              String(hookData.cell.raw) === "At Risk" ? [220, 38, 38] : [5, 150, 105];
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
          doc.text("BOED LMS • Confidential academic report", 14, pageHeight - 6);
          doc.text(`Page ${hookData.pageNumber} of ${totalPagesExpression}`, pageWidth - 14, pageHeight - 6, {
            align: "right",
          });
        },
      });

      doc.putTotalPages(totalPagesExpression);
      const safeScope = scopeLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45);
      doc.save(
        `student-performance-${safeScope || "all-courses"}-${generatedAt.toISOString().slice(0, 10)}.pdf`,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to generate the student performance PDF.",
      );
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              Individual reporting
            </p>
            <h2 className="mt-1 text-xl font-bold">Individual Student Reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View a learner&apos;s complete course marksheet or open the print-ready
              version to save as PDF.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-card-foreground">
              {loading && isFirstExport.current ? "…" : numberFormatter.format(total)}
            </span>
            <span className="text-muted-foreground">students</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by student name or email..."
              className="w-full min-w-0 rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm sm:w-56"
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          {canExport ? (
            <button
              type="button"
              onClick={() => {
                isFirstExport.current = false;
                void exportStudentPerformancePdf();
              }}
              disabled={loading || exportingPdf || students.length === 0}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportingPdf ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exportingPdf ? "Generating PDF..." : "Export This Page (PDF)"}
            </button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Loading student reports...
          </div>
        ) : students.length === 0 ? (
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
                {students.map((row) => {
                  const reportHref = `/admin/reports/students/${row.studentId}`;
                  return (
                    <tr key={row.studentId} className="hover:bg-muted/30">
                      <td className="px-4 py-4 text-sm">
                        <p className="font-semibold">{row.student}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
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
                        {row.scorePercent === null ? "-" : `${numberFormatter.format(row.scorePercent)}%`}
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
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskBadgeClass(row.risk)}`}
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

        {!loading && students.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {numberFormatter.format(showingFrom)}–{numberFormatter.format(showingTo)} of{" "}
              {numberFormatter.format(total)} students
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-xs text-muted-foreground">
                Page {numberFormatter.format(page)} of {numberFormatter.format(totalPages)}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
