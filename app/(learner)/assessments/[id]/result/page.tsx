"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FileText,
  Paperclip,
  Trophy,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock3,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  LearnerAssessmentDetail,
  LearnerAssessmentManualReviewStatus,
} from "@/lib/learner-assessment-types";

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanizeManualStatus(status: LearnerAssessmentManualReviewStatus) {
  switch (status) {
    case "NOT_REQUIRED":
      return "Auto graded";
    case "PENDING_MAKER":
      return "Pending maker review";
    case "MAKER_DRAFT":
      return "Maker review in progress";
    case "PENDING_CHECKER":
      return "Pending checker approval";
    case "RETURNED_TO_MAKER":
      return "Returned to maker";
    case "FINALIZED":
      return "Finalized";
    default:
      return status;
  }
}

function getResultBanner(
  manualReviewStatus: LearnerAssessmentManualReviewStatus,
  passed: boolean | null,
) {
  if (passed === true) {
    return {
      icon: CheckCircle,
      iconClassName: "text-green-500",
      titleKey: "assessmentsPage.result.passedTitle",
      messageKey: "assessmentsPage.result.passedMessage",
    };
  }

  if (passed === false) {
    return {
      icon: XCircle,
      iconClassName: "text-red-500",
      titleKey: "assessmentsPage.result.failedTitle",
      messageKey: "assessmentsPage.result.failedMessage",
    };
  }

  switch (manualReviewStatus) {
    case "PENDING_CHECKER":
      return {
        icon: ShieldCheck,
        iconClassName: "text-blue-500",
        title: "Maker review submitted",
        message: "Your script is waiting for final checker approval.",
      };
    case "RETURNED_TO_MAKER":
      return {
        icon: RotateCcw,
        iconClassName: "text-rose-500",
        title: "Review sent back internally",
        message:
          "A checker asked the maker to revise the grading. Final marks are not published yet.",
      };
    case "MAKER_DRAFT":
      return {
        icon: Clock3,
        iconClassName: "text-amber-500",
        title: "Review in progress",
        message: "A maker has started grading your submission.",
      };
    case "NOT_REQUIRED":
      return {
        icon: LoaderCircle,
        iconClassName: "text-primary",
        title: "Assessment submitted",
        message: "Your score is being finalized.",
      };
    case "FINALIZED":
      return {
        icon: ShieldCheck,
        iconClassName: "text-emerald-500",
        title: "Result finalized",
        message: "Your reviewed result has been published.",
      };
    case "PENDING_MAKER":
    default:
      return {
        icon: CheckCircle,
        iconClassName: "text-emerald-500",
        title: "Assessment submitted successfully",
        message:
          "Your answers have been received. The result will be published after maker review.",
      };
  }
}

export default function AssessmentResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const t = useTranslations();
  const submissionId = searchParams.get("submissionId") ?? undefined;
  const [detail, setDetail] = useState<LearnerAssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadResult() {
      try {
        setLoading(true);
        setError(null);

        const url = submissionId
          ? `/api/learner/assessments/${id}?submissionId=${submissionId}`
          : `/api/learner/assessments/${id}`;

        const response = await fetch(url, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load result.");
        }

        if (!controller.signal.aborted) setDetail(result);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load result.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadResult();
    return () => controller.abort();
  }, [id, submissionId, retry]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading result...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
        <div>
          <h1 className="mb-2 text-xl font-bold">Failed to load result</h1>
          <p className="text-muted-foreground">
            {error || "Result data could not be loaded."}
          </p>
          <button
            onClick={() => setRetry((value) => value + 1)}
            className="mt-4 min-h-11 rounded-xl bg-primary px-5 py-2 text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const submission = detail.submission;
  const published = Boolean(
    submission &&
    ["GRADED", "REVIEWED"].includes(submission.status) &&
    submission.obtainedMarks !== null,
  );
  const scorePercent = published ? submission?.scorePercent : null;
  const passed =
    published &&
    submission?.obtainedMarks !== null &&
    submission?.obtainedMarks !== undefined
      ? submission.obtainedMarks >= detail.assessment.passingMarks
      : null;
  const manualReviewStatus = submission?.manualReviewStatus ?? "PENDING_MAKER";
  const banner = getResultBanner(manualReviewStatus, passed);
  const BannerIcon = banner.icon;
  const feedback = submission?.feedback;
  const hasFeedback =
    Boolean(feedback?.makerComment) ||
    Boolean(feedback?.checkerComment) ||
    Boolean(feedback?.returnReason);
  const isManualAssessment =
    detail.assessment.type === "WRITTEN" ||
    detail.assessment.type === "PRACTICAL";

  const answers = submission?.review.length
    ? submission.review
    : detail.questions.map((question) => ({
        questionId: question.id,
        question: question.question,
        marks: question.marks,
        selectedAnswer: submission?.payload?.answers?.[question.id] ?? null,
        correctAnswer: null,
        isCorrect: false,
        finalMarks: null,
      }));
  const tone =
    passed === true
      ? "text-emerald-600 dark:text-emerald-400"
      : passed === false
        ? "text-rose-600 dark:text-rose-400"
        : "text-amber-600 dark:text-amber-400";
  const progress = Math.max(0, Math.min(100, scorePercent ?? 0));

  if (!submission)
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">No submission found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no result available for this attempt.
        </p>
        <Link
          href="/results"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-primary-foreground"
        >
          Back to results
        </Link>
      </div>
    );

  return (
    <div className="mx-auto min-w-0 space-y-5 pb-6 sm:space-y-6">
      <nav
        className="flex flex-wrap items-center justify-between gap-3"
        aria-label="Result navigation"
      >
        <Link
          href="/results"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          All results
        </Link>
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
          {detail.assessment.type}{" "}
          <span className="px-1 text-muted-foreground">/</span> Attempt{" "}
          {submission.attemptNumber}
        </span>
      </nav>

      <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:rounded-3xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-emerald-400" />
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Trophy className="h-4 w-4" />
              Assessment report
            </p>
            <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {detail.assessment.title}
            </h1>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">
                {detail.assessment.course.title}
              </span>
            </p>
            <div className="mt-6 rounded-xl bg-muted/40 p-4 sm:max-w-xl">
              <div className="flex items-start gap-3">
                <BannerIcon className={`mt-0.5 h-5 w-5 shrink-0 ${tone}`} />
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {"titleKey" in banner
                      ? t(banner.titleKey as never)
                      : banner.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {"messageKey" in banner
                      ? t(banner.messageKey as never)
                      : banner.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 lg:px-6">
            <div className={`relative h-40 w-40 sm:h-44 sm:w-44 ${tone}`}>
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 160 160"
                aria-hidden="true"
              >
                <circle
                  cx="80"
                  cy="80"
                  r="69"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-muted"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="69"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray="433.54"
                  strokeDashoffset={433.54 * (1 - progress / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {published ? (
                  <>
                    <span className="text-4xl font-bold tracking-tight">
                      {scorePercent !== null && scorePercent !== undefined
                        ? `${scorePercent}%`
                        : "?"}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Overall score
                    </span>
                  </>
                ) : (
                  <>
                    <Clock3 className="mb-2 h-8 w-8" />
                    <span className="text-sm font-semibold">In review</span>
                  </>
                )}
              </div>
            </div>
            <span
              className={`rounded-full bg-muted/50 px-4 py-1.5 text-xs font-semibold ${tone}`}
            >
              {passed === true
                ? "Passed"
                : passed === false
                  ? "Not passed"
                  : "Pending publication"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-border bg-muted/20 lg:grid-cols-4">
          <SummaryCard
            label="Marks earned"
            value={
              published
                ? `${submission.obtainedMarks} / ${detail.assessment.totalMarks}`
                : "Pending"
            }
            caption={published ? "Published result" : "Awaiting final review"}
          />
          <SummaryCard
            label="Passing marks"
            value={`${detail.assessment.passingMarks} / ${detail.assessment.totalMarks}`}
            caption="Required to pass"
          />
          <SummaryCard
            label="Questions"
            value={String(detail.questions.length)}
            caption={`${detail.assessment.type} assessment`}
          />
          <SummaryCard
            label="Submitted"
            value={
              submission.submittedAt
                ? new Intl.DateTimeFormat("en-BD", {
                    dateStyle: "medium",
                  }).format(new Date(submission.submittedAt))
                : "Not recorded"
            }
            caption={
              submission.submittedAt
                ? new Intl.DateTimeFormat("en-BD", {
                    timeStyle: "short",
                  }).format(new Date(submission.submittedAt))
                : "Submission time unavailable"
            }
          />
        </div>
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-semibold">Question review</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your answers and{" "}
                  {published ? "published marks" : "review progress"}, question
                  by question.
                </p>
              </div>
              <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">
                {answers.length} questions
              </span>
            </div>
            <div className="space-y-3 p-3 sm:p-5">
              {answers.map((item, index) => (
                <details
                  key={item.questionId}
                  open={index === 0}
                  className="group overflow-hidden rounded-xl border border-border"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed [overflow-wrap:anywhere]">
                        {item.question}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {published
                          ? `${item.finalMarks ?? "Pending"} / ${item.marks} marks`
                          : `${item.marks} possible marks`}
                      </p>
                    </div>
                    <ChevronDown className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-3 border-t border-border bg-muted/10 p-4">
                    <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Your answer
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                        {item.selectedAnswer || "No answer submitted"}
                      </p>
                    </div>
                    {published && item.correctAnswer !== null && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 sm:p-4">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Correct answer
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                          {item.correctAnswer}
                        </p>
                      </div>
                    )}
                    {isManualAssessment &&
                      "makerComment" in item &&
                      (item.makerComment || item.checkerComment) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {item.makerComment && (
                            <FeedbackCard
                              title="Reviewer feedback"
                              body={item.makerComment}
                            />
                          )}
                          {item.checkerComment && (
                            <FeedbackCard
                              title="Final reviewer feedback"
                              body={item.checkerComment}
                            />
                          )}
                        </div>
                      )}
                  </div>
                </details>
              ))}
              {!answers.length && (
                <p className="p-5 text-center text-sm text-muted-foreground">
                  No question review is available for this submission.
                </p>
              )}
            </div>
          </section>

          {hasFeedback && (
            <section className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MessageSquareText className="h-5 w-5 text-primary" />
                Review feedback
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {feedback?.makerComment && (
                  <FeedbackCard
                    title="Reviewer feedback"
                    body={feedback.makerComment}
                  />
                )}
                {feedback?.checkerComment && (
                  <FeedbackCard
                    title="Final reviewer feedback"
                    body={feedback.checkerComment}
                  />
                )}
              </div>
              {feedback?.returnReason && (
                <FeedbackCard
                  title="Review update"
                  body={feedback.returnReason}
                />
              )}
            </section>
          )}

          {submission.payload?.notes && (
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Submission notes</h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                {submission.payload.notes}
              </p>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Submission status</h2>
            <span
              className={`mt-3 inline-flex rounded-full bg-muted px-3 py-1.5 text-xs font-medium ${tone}`}
            >
              {humanizeManualStatus(manualReviewStatus)}
            </span>
            <ol className="mt-5 space-y-5">
              <TimelineItem
                label="Submission received"
                value={submission.submittedAt}
              />
              {isManualAssessment && (
                <>
                  <TimelineItem
                    label="Reviewed"
                    value={feedback?.makerMarkedAt ?? null}
                  />
                  <TimelineItem
                    label="Sent for final review"
                    value={feedback?.makerSubmittedAt ?? null}
                  />
                  <TimelineItem
                    label="Final review updated"
                    value={feedback?.checkedAt ?? null}
                  />
                </>
              )}
            </ol>
          </section>
          {Boolean(submission.payload?.attachments?.length) && (
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <Paperclip className="h-4 w-4 text-primary" />
                Attachments
              </h2>
              <div className="space-y-2">
                {submission.payload?.attachments?.map((attachment, index) => (
                  <a
                    key={index}
                    href={attachment}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm font-medium text-primary hover:bg-muted"
                  >
                    <span>Attachment {index + 1}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0" />
                    <span className="sr-only">Opens in a new tab</span>
                  </a>
                ))}
              </div>
            </section>
          )}
          <div className="space-y-3">
            <Link
              href={`/assessments/${detail.assessment.id}`}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Back to assessment
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium hover:bg-muted"
            >
              {t("assessmentsPage.result.returnToDashboard")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="min-w-0 border-b border-border p-4 odd:border-r sm:p-5 lg:border-b-0 lg:[&:not(:last-child)]:border-r">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-lg font-bold tracking-tight sm:text-xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
function TimelineItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
      >
        {value ? (
          <CheckCircle className="h-3.5 w-3.5" />
        ) : (
          <Clock3 className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {value ? formatDate(value) : "Pending"}
        </p>
      </div>
    </li>
  );
}
function FeedbackCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-muted/40 p-4">
      <p className="text-xs font-semibold text-primary">{title}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
        {body}
      </p>
    </div>
  );
}
