"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
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

function getStatusTone(status: LearnerAssessmentManualReviewStatus) {
  switch (status) {
    case "NOT_REQUIRED":
    case "FINALIZED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "PENDING_MAKER":
    case "MAKER_DRAFT":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "PENDING_CHECKER":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "RETURNED_TO_MAKER":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-border bg-muted text-muted-foreground";
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
        message: "A checker asked the maker to revise the grading. Final marks are not published yet.",
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

  useEffect(() => {
    async function loadResult() {
      try {
        setLoading(true);
        setError(null);

        const url = submissionId
          ? `/api/learner/assessments/${id}?submissionId=${submissionId}`
          : `/api/learner/assessments/${id}`;

        const response = await fetch(url, { cache: "no-store" });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load result.");
        }

        setDetail(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load result.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [id, submissionId]);

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
        </div>
      </div>
    );
  }

  const submission = detail.submission;
  const scorePercent = submission?.scorePercent;
  const passed =
    scorePercent !== null && scorePercent !== undefined
      ? scorePercent >=
        Math.round((detail.assessment.passingMarks / detail.assessment.totalMarks) * 100)
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
    detail.assessment.type === "WRITTEN" || detail.assessment.type === "PRACTICAL";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="space-y-6 rounded-lg border border-border bg-card p-8">
        <div
          className={`space-y-4 rounded-2xl py-6 text-center ${
            manualReviewStatus === "PENDING_MAKER"
              ? "border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/25"
              : ""
          }`}
        >
          <span
            className={`mx-auto grid h-24 w-24 place-items-center rounded-full ${
              manualReviewStatus === "PENDING_MAKER"
                ? "bg-emerald-500/10"
                : "bg-muted/50"
            }`}
          >
            <BannerIcon
              className={`h-16 w-16 ${
                banner.icon === LoaderCircle ? "animate-spin" : ""
              } ${banner.iconClassName}`}
            />
          </span>
          <h1 className="text-3xl font-bold text-card-foreground">
            {"titleKey" in banner ? t(banner.titleKey as never) : banner.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {"messageKey" in banner ? t(banner.messageKey as never) : banner.message}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Course"
            value={detail.assessment.course.title}
            caption={detail.assessment.title}
          />
          <SummaryCard
            label="Result"
            value={
              scorePercent !== null && scorePercent !== undefined
                ? `${scorePercent}%`
                : humanizeManualStatus(manualReviewStatus)
            }
            caption={
              submission?.obtainedMarks !== null && submission?.obtainedMarks !== undefined
                ? `${submission.obtainedMarks}/${detail.assessment.totalMarks} marks`
                : "Marks pending publication"
            }
          />
          <SummaryCard
            label="Pass Mark"
            value={`${detail.assessment.passingMarks}/${detail.assessment.totalMarks}`}
            caption="Passing threshold"
          />
          <div className="rounded-lg border border-border bg-muted/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Review Status
            </p>
            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusTone(
                manualReviewStatus,
              )}`}
            >
              {humanizeManualStatus(manualReviewStatus)}
            </span>
            <p className="mt-3 text-sm text-muted-foreground">
              Submitted: {formatDate(submission?.submittedAt ?? null)}
            </p>
          </div>
        </div>

        {isManualAssessment ? (
          <div className="rounded-lg border border-border bg-muted/30 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Manual Review Workflow
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <TimelineItem
                label="Maker marked"
                value={formatDate(feedback?.makerMarkedAt ?? null)}
              />
              <TimelineItem
                label="Sent to checker"
                value={formatDate(feedback?.makerSubmittedAt ?? null)}
              />
              <TimelineItem
                label="Checker updated"
                value={formatDate(feedback?.checkedAt ?? null)}
              />
            </div>
          </div>
        ) : null}

        {hasFeedback ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-card-foreground">
                Maker / Checker Feedback
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {feedback?.makerComment ? (
                <FeedbackCard
                  title="Maker feedback"
                  body={feedback.makerComment}
                />
              ) : null}
              {feedback?.checkerComment ? (
                <FeedbackCard
                  title="Checker feedback"
                  body={feedback.checkerComment}
                />
              ) : null}
            </div>
            {feedback?.returnReason ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Checker return reason</p>
                    <p className="mt-1 text-rose-800">{feedback.returnReason}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {submission && submission.review.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-card-foreground">
              {isManualAssessment ? "Question Review" : "Submitted Answers"}
            </h2>
            <div className="space-y-3">
              {submission.review.map((item, index) => (
                <div key={item.questionId} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">
                        Q{index + 1}. {item.question}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Answer: {item.selectedAnswer || "No answer"}
                      </p>
                      {item.correctAnswer !== null ? (
                        <p className="text-sm text-muted-foreground">
                          Correct: {item.correctAnswer}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-card-foreground">
                      {item.finalMarks ?? item.makerMarks ?? "Pending"} / {item.marks}
                    </div>
                  </div>

                  {isManualAssessment ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                        <p className="font-semibold text-card-foreground">
                          Maker
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Marks: {item.makerMarks ?? "Pending"} / {item.marks}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {item.makerComment || "No maker comment."}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                        <p className="font-semibold text-card-foreground">
                          Checker
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Marks: {item.checkerMarks ?? "Pending"} / {item.marks}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {item.checkerComment || "No checker comment."}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {submission?.payload?.attachments?.length ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-card-foreground">
              Uploaded Attachments
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {submission.payload.attachments.map((attachment, index) => (
                <a
                  key={`${attachment.slice(0, 20)}-${index}`}
                  href={attachment}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all rounded-lg border border-border bg-muted p-3 text-sm text-primary"
                >
                  Attachment {index + 1}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {submission?.payload?.answers && Object.keys(submission.payload.answers).length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-card-foreground">
              Answer Map
            </h2>
            <div className="space-y-2">
              {Object.entries(submission.payload.answers).map(([questionId, answer]) => (
                <div key={questionId} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{questionId}</p>
                  <p className="text-sm text-card-foreground">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-8 py-3 text-center font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("assessmentsPage.result.returnToDashboard")}
          </Link>
          <Link
            href={`/assessments/${detail.assessment.id}`}
            className="rounded-lg border border-border px-8 py-3 text-center font-semibold hover:bg-muted"
          >
            Back to Assessment
          </Link>
        </div>
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
    <div className="rounded-lg border border-border bg-muted/40 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-card-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-card-foreground">{value}</p>
    </div>
  );
}

function FeedbackCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm font-semibold text-card-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
