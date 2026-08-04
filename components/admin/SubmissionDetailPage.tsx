"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import WrittenQuestionContent from "@/components/assessment/written-question-content";
import { parseApiJson } from "@/lib/parse-api-json";
import type {
  GradingSubmissionDetail,
  SubmissionLearnerHistoryPayload,
} from "@/lib/submission-grading-types";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  LoaderCircle,
  Paperclip,
  UserRound,
} from "lucide-react";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanizeStatus(status: string) {
  switch (status) {
    case "PENDING_MAKER":
      return "Pending Maker";
    case "MAKER_DRAFT":
      return "Maker Draft";
    case "PENDING_CHECKER":
      return "Pending Checker";
    case "RETURNED_TO_MAKER":
      return "Returned to Maker";
    case "FINALIZED":
      return "Finalized";
    case "NOT_REQUIRED":
      return "Auto Graded";
    default:
      return status;
  }
}

function statusClass(status: string) {
  switch (status) {
    case "FINALIZED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "PENDING_CHECKER":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300";
    case "RETURNED_TO_MAKER":
      return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300";
    case "MAKER_DRAFT":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300";
  }
}

function displayScore(submission: GradingSubmissionDetail) {
  const marks =
    submission.obtainedMarks ??
    submission.checkerTotalMarks ??
    submission.makerTotalMarks;
  return marks === null ? "Pending" : `${marks}/${submission.totalMarks}`;
}

function finalQuestionMarks(
  question: GradingSubmissionDetail["questions"][number],
) {
  return question.checkerMarks ?? question.makerMarks;
}

export default function SubmissionDetailPage({
  submissionId,
}: {
  submissionId: string;
}) {
  const { can } = useAdminPermissions();
  const canExport = can("SUBMISSIONS", "export");
  const [data, setData] = useState<SubmissionLearnerHistoryPayload | null>(null);
  const [activeId, setActiveId] = useState(submissionId);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/submissions/${submissionId}`, {
          cache: "no-store",
        });
        const result = await parseApiJson<
          SubmissionLearnerHistoryPayload & { error?: string }
        >(response);
        if (!response.ok || !result.submission) {
          throw new Error(result.error ?? "Failed to load submission details.");
        }
        if (!cancelled) {
          setData(result);
          setActiveId(result.submission.id);
        }
      } catch (caught) {
        if (!cancelled) {
          setData(null);
          setError(
            caught instanceof Error
              ? caught.message
              : "Failed to load submission details.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const activeSubmission = useMemo(
    () =>
      data?.submissions.find((submission) => submission.id === activeId) ??
      data?.submission ??
      null,
    [activeId, data],
  );

  const summary = useMemo(() => {
    const submissions = data?.submissions ?? [];
    const graded = submissions.filter(
      (submission) => submission.obtainedMarks !== null,
    );
    const average = graded.length
      ? Math.round(
          graded.reduce(
            (sum, submission) =>
              sum +
              ((submission.obtainedMarks ?? 0) / submission.totalMarks) * 100,
            0,
          ) / graded.length,
        )
      : null;
    return {
      total: submissions.length,
      finalized: submissions.filter(
        (submission) => submission.manualReviewStatus === "FINALIZED",
      ).length,
      pending: submissions.filter(
        (submission) => submission.manualReviewStatus !== "FINALIZED",
      ).length,
      average,
    };
  }, [data?.submissions]);

  async function exportSubmissionPdf() {
    if (!activeSubmission || !data) return;
    setExporting(true);
    setError(null);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      const totalPages = "{total_pages_count_string}";

      doc.setFillColor(216, 32, 40);
      doc.rect(0, 0, width, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text("Submission & Grading Report", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(data.learner.name, 14, 27);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(data.learner.email, 14, 32);
      doc.text(`Assessment: ${activeSubmission.assessmentTitle}`, 105, 25);
      doc.text(`Course: ${activeSubmission.courseTitle}`, 105, 31);
      doc.text(`Submitted: ${formatDate(activeSubmission.submittedAt)}`, 105, 37);
      doc.text(`Status: ${humanizeStatus(activeSubmission.manualReviewStatus)}`, width - 14, 17, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(216, 32, 40);
      doc.text(displayScore(activeSubmission), width - 14, 26, { align: "right" });
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 41, width - 14, 41);

      const attachmentCount =
        activeSubmission.answerPayload?.attachments?.length ?? 0;
      const answerFallback = activeSubmission.answerPayload?.notes?.trim()
        ? activeSubmission.answerPayload.notes.trim()
        : attachmentCount > 0
          ? `Submitted as ${attachmentCount} attachment(s). See the LMS submission record.`
          : "No response was recorded.";

      autoTable(doc, {
        startY: 45,
        margin: { top: 25, left: 14, right: 14, bottom: 15 },
        head: [[
          "#",
          "Question",
          "Learner Answer",
          "Maker",
          "Checker",
          "Final Feedback",
        ]],
        body:
          activeSubmission.questions.length > 0
            ? activeSubmission.questions.map((question, index) => [
                index + 1,
                question.prompt,
                question.learnerAnswer?.trim() || answerFallback,
                question.makerMarks === null
                  ? "—"
                  : `${question.makerMarks}/${question.maxMarks}`,
                question.checkerMarks === null
                  ? "—"
                  : `${question.checkerMarks}/${question.maxMarks}`,
                question.checkerComment ?? question.makerComment ?? "—",
              ])
            : [[
                1,
                "Overall assessment submission",
                activeSubmission.answerPayload?.notes ?? "See submitted attachment(s)",
                activeSubmission.makerTotalMarks ?? "—",
                activeSubmission.checkerTotalMarks ?? "—",
                activeSubmission.checkerComment ?? activeSubmission.makerComment ?? "—",
              ]],
        theme: "grid",
        rowPageBreak: "avoid",
        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3,
          valign: "top",
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          textColor: [51, 65, 85],
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [216, 32, 40],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 9, halign: "center" },
          1: { cellWidth: 72 },
          2: { cellWidth: 95 },
          3: { cellWidth: 18, halign: "center" },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 57 },
        },
        didDrawPage: ({ pageNumber }) => {
          if (pageNumber > 1) {
            doc.setFillColor(216, 32, 40);
            doc.rect(0, 0, width, 5, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(17, 24, 39);
            doc.text("Submission & Grading Report", 14, 15);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(
              `${data.learner.name} • ${activeSubmission.assessmentTitle}`,
              width - 14,
              15,
              { align: "right" },
            );
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 20, width - 14, 20);
          }

          doc.setDrawColor(226, 232, 240);
          doc.line(14, height - 10, width - 14, height - 10);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text("BOED LMS • Confidential submission report", 14, height - 6);
          doc.text(`Page ${pageNumber} of ${totalPages}`, width - 14, height - 6, {
            align: "right",
          });
        },
      });
      doc.putTotalPages(totalPages);
      const safeName = data.learner.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      doc.save(`submission-${safeName || data.learner.id}-${activeSubmission.id}.pdf`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to export the PDF.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminLayout title="Submission Details">
      <div className="min-w-0 space-y-6 p-4 sm:p-6">
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/admin/submissions"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Submission Inbox
              </Link>
              <div className="mt-4 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                  <UserRound className="h-6 w-6" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-card-foreground">
                    {data?.learner.name ?? "Learner Submissions"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {data?.learner.email ?? "Submission and grading history"}
                  </p>
                </div>
              </div>
            </div>
            {canExport && activeSubmission ? (
              <button
                type="button"
                onClick={() => void exportSubmissionPdf()}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {exporting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {exporting ? "Generating PDF..." : "Export Current Submission"}
              </button>
            ) : null}
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
            Loading learner submissions...
          </div>
        ) : error && !data ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : data && activeSubmission ? (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard icon={FileText} label="Submissions" value={String(summary.total)} tone="blue" />
              <SummaryCard icon={CheckCircle2} label="Finalized" value={String(summary.finalized)} tone="emerald" />
              <SummaryCard icon={ClipboardCheck} label="Pending Review" value={String(summary.pending)} tone="amber" />
              <SummaryCard icon={Award} label="Average Score" value={summary.average === null ? "—" : `${summary.average}%`} tone="violet" />
            </section>

            <section className="grid min-w-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
              <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
                <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <p className="font-semibold text-card-foreground">Learner Submissions</p>
                  <p className="text-xs text-muted-foreground">Only submissions from this learner</p>
                </div>
                <div className="max-h-[42vh] overflow-y-auto">
                  {data.submissions.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      onClick={() => setActiveId(submission.id)}
                      className={`w-full border-b border-border p-4 text-left transition-colors last:border-b-0 hover:bg-muted/40 ${
                        activeSubmission.id === submission.id ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-card-foreground">{submission.assessmentTitle}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(submission.manualReviewStatus)}`}>
                          {humanizeStatus(submission.manualReviewStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{submission.courseTitle}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatDate(submission.submittedAt)}</span>
                        <span className="font-bold text-primary">{displayScore(submission)}</span>
                      </div>
                    </button>
                  ))}
                </div>
                </aside>

                <GradingPanel submission={activeSubmission} />
              </div>

              <div className="min-w-0 space-y-5">
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-card-foreground">{activeSubmission.assessmentTitle}</h2>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(activeSubmission.manualReviewStatus)}`}>
                          {humanizeStatus(activeSubmission.manualReviewStatus)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{activeSubmission.courseTitle} • {activeSubmission.assessmentType}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Result</p>
                      <p className="mt-1 text-2xl font-bold text-primary">{displayScore(activeSubmission)}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailMetric label="Submitted" value={formatDate(activeSubmission.submittedAt)} />
                    <DetailMetric label="Maker" value={activeSubmission.makerName ?? "Unassigned"} />
                    <DetailMetric label="Checker" value={activeSubmission.checkerName ?? "Unassigned"} />
                    <DetailMetric label="Attachments" value={String(activeSubmission.answerPayload?.attachments?.length ?? 0)} />
                  </div>
                </section>

                <SubmissionPanel submission={activeSubmission} />

                {error ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}

function SubmissionPanel({ submission }: { submission: GradingSubmissionDetail }) {
  const attachments = submission.answerPayload?.attachments ?? [];
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-blue-200/80 bg-card shadow-sm dark:border-blue-900/80">
      <div className="border-b border-blue-200/80 bg-blue-50/70 px-5 py-4 dark:border-blue-900/80 dark:bg-blue-950/30">
        <h3 className="flex items-center gap-2 font-bold text-card-foreground"><GraduationCap className="h-5 w-5 text-blue-600" />Learner Submission</h3>
        <p className="mt-1 text-xs text-muted-foreground">Answers and uploaded evidence</p>
      </div>
      <div className="space-y-4 p-5">
        {submission.answerPayload?.notes ? (
          <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
            <p className="font-semibold">Submission note</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{submission.answerPayload.notes}</p>
          </div>
        ) : null}
        {attachments.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />Attachments ({attachments.length})</p>
            {attachments.map((attachment, index) =>
              attachment.startsWith("data:image") ? (
                <img key={index} src={attachment} alt={`Submission attachment ${index + 1}`} className="max-h-80 w-full rounded-xl border border-border object-contain" />
              ) : (
                <a key={index} href={attachment} target="_blank" rel="noreferrer" className="block break-all rounded-xl border border-border p-3 text-sm text-primary hover:bg-muted/30">Open attachment {index + 1}</a>
              ),
            )}
          </div>
        ) : null}
        <div className="space-y-3">
          {submission.questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No question-level answer was stored for this assessment.</p>
          ) : (
            submission.questions.map((question, index) => (
              <article key={question.questionId} className="min-w-0 rounded-xl border border-border bg-muted/15 p-4">
                <div className="text-sm font-semibold text-card-foreground">
                  <span>Q{index + 1}. </span>
                  {question.type === "WRITTEN" ? (
                    <WrittenQuestionContent prompt={question.prompt} options={question.options} className="mt-1" />
                  ) : (
                    <span className="break-words">{question.prompt}</span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-sm text-muted-foreground">{question.learnerAnswer ?? "No inline answer submitted."}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function GradingPanel({ submission }: { submission: GradingSubmissionDetail }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200/80 bg-card shadow-sm dark:border-emerald-900/80">
      <div className="border-b border-emerald-200/80 bg-emerald-50/70 px-5 py-4 dark:border-emerald-900/80 dark:bg-emerald-950/30">
        <h3 className="flex items-center gap-2 font-bold text-card-foreground"><ClipboardCheck className="h-5 w-5 text-emerald-600" />Grading Result</h3>
        <p className="mt-1 text-xs text-muted-foreground">Maker and checker review shown together</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailMetric label="Maker Marks" value={submission.makerTotalMarks === null ? "Pending" : `${submission.makerTotalMarks}/${submission.totalMarks}`} />
          <DetailMetric label="Checker / Final" value={displayScore(submission)} />
          <DetailMetric label="Maker Updated" value={formatDate(submission.makerMarkedAt)} />
          <DetailMetric label="Checker Updated" value={formatDate(submission.checkedAt)} />
        </div>
        {submission.returnReason ? <Feedback label="Return reason" value={submission.returnReason} tone="rose" /> : null}
        {submission.makerComment ? <Feedback label="Maker comment" value={submission.makerComment} tone="blue" /> : null}
        {submission.checkerComment ? <Feedback label="Checker comment" value={submission.checkerComment} tone="emerald" /> : null}
        <div className="space-y-3">
          {submission.questions.length === 0 ? (
            <div className="rounded-xl border border-border p-4 text-sm">
              <p className="font-semibold">Overall grading</p>
              <p className="mt-1 text-muted-foreground">Final score: {displayScore(submission)}</p>
            </div>
          ) : (
            submission.questions.map((question, index) => (
              <article key={question.questionId} className="rounded-xl border border-border bg-muted/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Question {index + 1}</p>
                  <p className="text-sm font-bold text-emerald-600">{finalQuestionMarks(question) ?? "—"}/{question.maxMarks}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Maker: {question.makerMarks ?? "—"}</span>
                  <span>Checker: {question.checkerMarks ?? "—"}</span>
                </div>
                {question.makerComment ? <p className="mt-3 text-xs text-muted-foreground">Maker: {question.makerComment}</p> : null}
                {question.checkerComment ? <p className="mt-1 text-xs text-muted-foreground">Checker: {question.checkerComment}</p> : null}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function Feedback({ label, value, tone }: { label: string; value: string; tone: "blue" | "emerald" | "rose" }) {
  const color = {
    blue: "border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30",
    emerald: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30",
    rose: "border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30",
  }[tone];
  return <div className={`rounded-xl border p-4 text-sm ${color}`}><p className="font-semibold">{label}</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{value}</p></div>;
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof FileText; label: string; value: string; tone: "blue" | "emerald" | "amber" | "violet" }) {
  const color = {
    blue: "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
    emerald: "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
    amber: "border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    violet: "border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300",
  }[tone];
  return <div className={`flex items-center justify-between rounded-2xl border p-4 shadow-sm ${color}`}><div><p className="text-xs font-semibold uppercase tracking-wider opacity-75">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><span className="rounded-xl bg-white/60 p-3 dark:bg-black/15"><Icon className="h-5 w-5" /></span></div>;
}
