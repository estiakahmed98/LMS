"use client";

import AdminLayout from "@/components/AdminLayout";
import type {
  AdminReportAssessmentType,
  AdminStudentAssessmentRow,
  AdminStudentProfile,
  AdminStudentRisk,
} from "@/lib/admin-report-types";
import { ArrowLeft, Eye, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function riskTone(risk: AdminStudentRisk) {
  if (risk === "At Risk") return "bg-red-500/10 text-red-600";
  if (risk === "Watch") return "bg-amber-500/10 text-amber-600";
  if (risk === "Not Started") return "bg-slate-500/10 text-slate-600";
  return "bg-emerald-500/10 text-emerald-600";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const ASSESSMENT_TABS: { key: AdminReportAssessmentType; label: string }[] = [
  { key: "MCQ", label: "MCQ" },
  { key: "WRITTEN", label: "CQ" },
  { key: "PRACTICAL", label: "Practical" },
  { key: "MIXED", label: "Mixed" },
];

export default function StudentProfilePage({
  profile,
  canExport,
  backHref = "/admin/reports",
  autoPrint = false,
}: {
  profile: AdminStudentProfile;
  canExport: boolean;
  backHref?: string;
  autoPrint?: boolean;
}) {
  function handlePrint() {
    if (!canExport) return;
    const previousTitle = document.title;
    document.title = `${profile.student} - Student Report`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  useEffect(() => {
    if (!autoPrint || !canExport) return;
    const timer = window.setTimeout(() => handlePrint(), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, canExport]);

  const assessmentsByType = useMemo(() => {
    const map = new Map<AdminReportAssessmentType, AdminStudentAssessmentRow[]>();
    for (const row of profile.assessments) {
      map.set(row.type, [...(map.get(row.type) ?? []), row]);
    }
    return map;
  }, [profile.assessments]);

  const availableTabs = ASSESSMENT_TABS.filter(
    (tab) => (assessmentsByType.get(tab.key)?.length ?? 0) > 0,
  );
  const [activeType, setActiveType] = useState<AdminReportAssessmentType | null>(
    availableTabs[0]?.key ?? null,
  );
  const activeRows = activeType ? (assessmentsByType.get(activeType) ?? []) : [];

  return (
    <AdminLayout title="Student Report">
      <main className="space-y-6 p-4 sm:p-6 print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
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
          <p className="text-sm font-semibold text-primary">Student Report</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-card-foreground">
                {profile.student}
              </h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generated {formatDate(profile.generatedAt)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Overall Standing
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-bold ${riskTone(profile.summary.risk)}`}
              >
                {profile.summary.risk}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 md:grid-cols-6">
            <Info label="Courses" value={`${profile.summary.courseCount}`} />
            <Info label="Avg. Progress" value={`${profile.summary.avgProgress}%`} />
            <Info
              label="Avg. Score"
              value={
                profile.summary.scorePercent === null
                  ? "-"
                  : `${profile.summary.scorePercent}%`
              }
            />
            <Info label="Passed" value={`${profile.summary.passed}`} />
            <Info label="Failed" value={`${profile.summary.failed}`} />
            <Info label="Certificates" value={`${profile.summary.certificatesEarned}`} />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-bold">Subject-wise Performance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Courses with at least one published assessment for this learner.
            </p>
          </div>

          {profile.courses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No courses with published assessments found for this learner.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-border bg-muted/70">
                  <tr>
                    {[
                      "Course",
                      "Progress",
                      "Score",
                      "Passed / Failed",
                      "Pending",
                      "Status",
                      "Risk",
                      "",
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
                  {profile.courses.map((row) => (
                    <tr key={row.courseId} className="hover:bg-muted/30">
                      <td className="px-4 py-4 text-sm font-semibold">{row.course}</td>
                      <td className="px-4 py-4 text-sm">{row.progress}%</td>
                      <td className="px-4 py-4 text-sm">
                        {row.scorePercent === null ? "-" : `${row.scorePercent}%`}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="font-semibold text-emerald-600">
                          {row.passed}
                        </span>
                        {" / "}
                        <span className="font-semibold text-red-600">
                          {row.failed}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-amber-600">
                        {row.pending}
                      </td>
                      <td className="px-4 py-4 text-sm">{row.status}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${riskTone(row.risk)}`}
                        >
                          {row.risk}
                        </span>
                      </td>
                      <td className="px-4 py-4 print:hidden">
                        <Link
                          href={`/admin/reports/marksheets/${row.courseId}/${profile.studentId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Marksheet
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="text-lg font-bold">Assessment Results</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Published assessments only, grouped by type.
            </p>
          </div>

          {availableTabs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No published assessments found for this learner yet.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3 print:hidden">
                {availableTabs.map((tab) => {
                  const count = assessmentsByType.get(tab.key)?.length ?? 0;
                  const isActive = activeType === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveType(tab.key)}
                      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`ml-1.5 text-xs ${isActive ? "opacity-80" : "text-muted-foreground"}`}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Printed output lists every type as its own block, since tab
                  switches don't exist on paper. */}
              <div className="hidden print:block">
                {availableTabs.map((tab) => (
                  <AssessmentTypeTable
                    key={tab.key}
                    title={tab.label}
                    rows={assessmentsByType.get(tab.key) ?? []}
                  />
                ))}
              </div>

              <div className="print:hidden">
                <AssessmentTypeTable
                  title={availableTabs.find((tab) => tab.key === activeType)?.label ?? ""}
                  rows={activeRows}
                  hideTitle
                />
              </div>
            </>
          )}
        </section>
      </main>
    </AdminLayout>
  );
}

function AssessmentTypeTable({
  title,
  rows,
  hideTitle = false,
}: {
  title: string;
  rows: AdminStudentAssessmentRow[];
  hideTitle?: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="border-b border-border last:border-b-0">
      {!hideTitle ? (
        <p className="px-5 pt-4 text-sm font-bold text-primary">{title}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b border-border bg-muted/70">
            <tr>
              {["Assessment", "Course", "Marks", "Percent", "Result", "Submitted"].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.assessmentId} className="hover:bg-muted/30">
                <td className="px-4 py-4 text-sm font-semibold">{row.assessment}</td>
                <td className="px-4 py-4 text-sm">{row.course}</td>
                <td className="px-4 py-4 text-sm">
                  {row.obtainedMarks === null
                    ? "Pending"
                    : `${row.obtainedMarks}/${row.totalMarks}`}
                </td>
                <td className="px-4 py-4 text-sm">
                  {row.scorePercent === null ? "-" : `${row.scorePercent}%`}
                </td>
                <td className="px-4 py-4 text-sm">
                  {row.passed === null ? row.status : row.passed ? "Passed" : "Failed"}
                </td>
                <td className="px-4 py-4 text-sm text-muted-foreground">
                  {formatDate(row.submittedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
