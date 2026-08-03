"use client";

import AdminLayout from "@/components/AdminLayout";
import type { AdminConsolidatedMarksheet } from "@/lib/admin-report-types";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function resultTone(result: string) {
  if (result === "Passed") return "text-emerald-700";
  if (result === "Needs Improvement") return "text-red-700";
  return "text-amber-700";
}

export default function ConsolidatedMarksheetPage({
  marksheet,
  canExport,
  backHref = "/admin/reports",
  wrapInAdminLayout = true,
}: {
  marksheet: AdminConsolidatedMarksheet;
  canExport: boolean;
  backHref?: string;
  wrapInAdminLayout?: boolean;
}) {
  function handlePrint() {
    if (!canExport) return;
    const previousTitle = document.title;
    document.title = `${marksheet.student} - ${marksheet.course} Marksheet`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  const content = (
    <>
      <PrintableMarksheet marksheet={marksheet} />
      <div className="space-y-6 p-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Link>
          {canExport ? (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
          ) : null}
        </div>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-primary">
           Marksheet
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">
                {marksheet.student}
              </h1>
              <p className="text-sm text-muted-foreground">{marksheet.email}</p>
              <p className="mt-1 text-sm font-medium">{marksheet.course}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Final Result
              </p>
              <p className={`mt-1 text-lg font-bold ${resultTone(marksheet.summary.result)}`}>
                {marksheet.summary.result}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Info label="Total Marks" value={`${marksheet.summary.obtainedMarks}/${marksheet.summary.totalMarks}`} />
            <Info label="Percentage" value={marksheet.summary.scorePercent === null ? "-" : `${marksheet.summary.scorePercent}%`} />
            <Info label="Assessments" value={`${marksheet.summary.gradedCount}/${marksheet.summary.assessmentCount} graded`} />
            <Info label="Result" value={marksheet.summary.result} />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-border bg-muted/70">
              <tr>
                {["Assessment", "Type", "Marks", "Percent", "Result", "Submitted"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {marksheet.assessments.map((row) => (
                <tr key={row.assessmentId}>
                  <td className="px-4 py-4 text-sm font-semibold">{row.title}</td>
                  <td className="px-4 py-4 text-sm">{row.type}</td>
                  <td className="px-4 py-4 text-sm">
                    {row.obtainedMarks === null ? "Pending" : `${row.obtainedMarks}/${row.totalMarks}`}
                  </td>
                  <td className="px-4 py-4 text-sm">{row.scorePercent === null ? "-" : `${row.scorePercent}%`}</td>
                  <td className="px-4 py-4 text-sm">{row.passed === null ? row.status : row.passed ? "Passed" : "Failed"}</td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">{formatDate(row.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );

  if (!wrapInAdminLayout) return content;
  return <AdminLayout title="Marksheet">{content}</AdminLayout>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function PrintableMarksheet({
  marksheet,
}: {
  marksheet: AdminConsolidatedMarksheet;
}) {
  return (
    <div className="question-paper-print hidden bg-white text-black print:block print:p-6">
      <header className="border-b-2 border-black pb-4 text-center">
        <h1 className="text-2xl font-bold uppercase tracking-wide">
         Marksheet
        </h1>
        <h2 className="mt-1 text-lg font-semibold">{marksheet.course}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 text-left text-sm">
          <p><span className="font-bold">Student:</span> {marksheet.student}</p>
          <p><span className="font-bold">Email:</span> {marksheet.email}</p>
          <p><span className="font-bold">Generated:</span> {formatDate(marksheet.generatedAt)}</p>
          <p><span className="font-bold">Result:</span> {marksheet.summary.result}</p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-3 gap-2 text-sm">
        <div className="border border-black p-2">
          <p className="font-bold">Total</p>
          <p>{marksheet.summary.obtainedMarks}/{marksheet.summary.totalMarks}</p>
        </div>
        <div className="border border-black p-2">
          <p className="font-bold">Percentage</p>
          <p>{marksheet.summary.scorePercent ?? "-"}%</p>
        </div>
        <div className="border border-black p-2">
          <p className="font-bold">Assessments</p>
          <p>{marksheet.summary.gradedCount}/{marksheet.summary.assessmentCount} graded</p>
        </div>
      </section>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr>
            {["Assessment", "Type", "Marks", "%", "Result"].map((heading) => (
              <th key={heading} className="border border-black px-2 py-2 text-left">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {marksheet.assessments.map((row) => (
            <tr key={row.assessmentId} className="break-inside-avoid">
              <td className="border border-black px-2 py-2 font-semibold">{row.title}</td>
              <td className="border border-black px-2 py-2">{row.type}</td>
              <td className="border border-black px-2 py-2">
                {row.obtainedMarks === null ? "Pending" : `${row.obtainedMarks}/${row.totalMarks}`}
              </td>
              <td className="border border-black px-2 py-2">{row.scorePercent ?? "-"}</td>
              <td className="border border-black px-2 py-2">
                {row.passed === null ? row.status : row.passed ? "Passed" : "Failed"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
