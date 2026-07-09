"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle, LoaderCircle, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LearnerAssessmentDetail } from "@/lib/learner-assessment-types";

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-8 space-y-6">
        {scorePercent !== null && scorePercent !== undefined ? (
          passed ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
              <h1 className="text-3xl font-bold text-card-foreground">
                {t("assessmentsPage.result.passedTitle")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("assessmentsPage.result.passedMessage")}
              </p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <XCircle className="w-24 h-24 text-red-500 mx-auto" />
              <h1 className="text-3xl font-bold text-card-foreground">
                {t("assessmentsPage.result.failedTitle")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {t("assessmentsPage.result.failedMessage")}
              </p>
            </div>
          )
        ) : (
          <div className="text-center space-y-4">
            <LoaderCircle className="w-20 h-20 text-primary mx-auto animate-spin" />
            <h1 className="text-3xl font-bold text-card-foreground">
              Assessment submitted
            </h1>
            <p className="text-lg text-muted-foreground">
              Your submission is waiting for review.
            </p>
          </div>
        )}

        <div className="bg-muted rounded-lg p-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            {detail.assessment.course.title}
          </p>
          <p className="text-5xl font-bold text-primary">
            {scorePercent !== null && scorePercent !== undefined
              ? `${scorePercent}%`
              : submission?.status ?? "SUBMITTED"}
          </p>
          <p className="text-muted-foreground mt-2">
            {scorePercent !== null && scorePercent !== undefined
              ? t("assessmentsPage.result.yourScore")
              : "Result pending grading"}
          </p>
        </div>

        {submission && submission.review.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-card-foreground">
              Submitted Answers
            </h2>
            <div className="space-y-3">
              {submission.review.map((item) => (
                <div key={item.questionId} className="rounded-lg border border-border p-4">
                  <p className="text-sm font-semibold text-card-foreground">
                    {item.question}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Answer: {item.selectedAnswer || "No answer"}
                  </p>
                  {item.correctAnswer !== null && (
                    <p className="text-sm text-muted-foreground">
                      Correct: {item.correctAnswer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                  className="rounded-lg border border-border bg-muted p-3 text-sm text-primary break-all"
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

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold text-center"
          >
            {t("assessmentsPage.result.returnToDashboard")}
          </Link>
          <Link
            href={`/assessments/${detail.assessment.id}`}
            className="px-8 py-3 border border-border rounded-lg hover:bg-muted font-semibold text-center"
          >
            Back to Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
