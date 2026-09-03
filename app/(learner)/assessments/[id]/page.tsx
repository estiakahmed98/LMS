"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import McqAssessment from "@/components/assessment/mcq-assessment";
import WrittenAssessment from "@/components/assessment/written-assessment";
import PracticalAssessment from "@/components/assessment/practical-assessment";
import { ArrowLeft, Clock, FileText, ListChecks, FlaskConical, LoaderCircle, TriangleAlert } from "lucide-react";
import type { LearnerAssessmentDetail } from "@/lib/learner-assessment-types";
import { usePortalPermissions } from "@/components/portal/PortalPermissionsProvider";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const { can } = usePortalPermissions();
  const canTakeAssessment = can("ASSESSMENTS", "view");
  const [detail, setDetail] = useState<LearnerAssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  useEffect(() => {
    async function loadAssessment() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/learner/assessments/${id}`, {
          cache: "no-store",
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.error || "Failed to load assessment.");
        }

        setDetail(result);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load assessment.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssessment();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6 text-center">
        <div>
          <h1 className="mb-2 text-xl font-bold">Failed to load assessment</h1>
          <p className="text-muted-foreground">
            {error || "This assessment could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  const BackButton = () => (
    <button
      onClick={() => {
        if (started) {
          setShowBackConfirm(true);
          return;
        }
        router.back();
      }}
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      {t("assessmentsPage.back")}
    </button>
  );

  const assessment = detail.assessment;
  const questions = detail.questions;
  const submission = detail.submission;
  const access = detail.access;
  const scorePending =
    submission !== null &&
    (submission.scorePercent === null ||
      !["GRADED", "REVIEWED"].includes(submission.status));

  const typeMetaMap = {
    MCQ: { icon: ListChecks, label: t("assessmentsPage.start.typeLabels.MCQ") },
    WRITTEN: { icon: FileText, label: t("assessmentsPage.start.typeLabels.WRITTEN") },
    PRACTICAL: {
      icon: FlaskConical,
      label: t("assessmentsPage.start.typeLabels.PRACTICAL"),
    },
    MIXED: { icon: FileText, label: "Mixed" },
  } as const;

  const typeMeta = typeMetaMap[assessment.type] ?? {
    icon: FileText,
    label: assessment.type,
  };
  const Icon = typeMeta.icon;

  if (!started) {
    return (
      <div className="py-10">
        <BackButton />

        <div className="bg-card border mt-10 max-w-xl mx-auto border-border rounded-xl p-8 text-center flex flex-col items-center gap-4">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary">
            <Icon className="w-7 h-7" />
          </span>

          <h1 className="text-2xl font-bold text-card-foreground">
            {assessment.title}
          </h1>
          <p className="text-sm text-muted-foreground">{typeMeta.label}</p>
          <p className="text-sm text-muted-foreground">
            {assessment.course.title}
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2 flex-wrap justify-center">
            <span>
              {t("assessmentsPage.start.totalMarks", {
                marks: assessment.totalMarks,
              })}
            </span>
            <span>
              {t("assessmentsPage.start.passingMarks", {
                marks: assessment.passingMarks,
              })}
            </span>
            {questions.length > 0 && (
              <span>
                {t("assessmentsPage.start.questionsCount", {
                  count: questions.length,
                })}
              </span>
            )}
            {access ? (
              <span>
                Attempts: {access.attemptsUsed}/{access.attemptLimit}
              </span>
            ) : null}
          </div>
          {access?.dueAt ? (
            <p className="text-sm text-muted-foreground">
              Submission deadline: {formatDateTime(access.dueAt)}
            </p>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2 mt-2">
            <Clock className="w-4 h-4" />
            {t("assessmentsPage.start.timerNotice")}
          </div>

          {submission ? (
            <div className="w-full rounded-lg border border-border bg-muted/40 p-4 text-left space-y-3">
              <p className="text-sm font-semibold text-card-foreground">
                Current status: {submission.status}
              </p>
              <p className="text-sm text-muted-foreground">
                Score:{" "}
                {submission.scorePercent !== null
                  ? `${submission.scorePercent}%`
                  : "Pending"}
              </p>
              <button
                onClick={() =>
                  router.push(`/assessments/${assessment.id}/result?submissionId=${submission.id}`)
                }
                className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                View Result
              </button>
              {scorePending ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                  Your score is pending. You can start this assessment again
                  after grading is completed.
                </p>
              ) : null}
            </div>
          ) : null}
          {!access ? (
            <p className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              This assessment is not currently assigned or published for you.
              {submission ? " You can still view your previous result." : ""}
            </p>
          ) : access && !access.canAttempt && !scorePending ? (
            <p className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {access.attemptsUsed >= access.attemptLimit
                ? `You have used all ${access.attemptLimit} allowed attempt(s).`
                : "The submission deadline has passed."}
            </p>
          ) : null}

          {canTakeAssessment && access?.canAttempt && !scorePending && (
            <button
              onClick={() => setShowStartConfirm(true)}
              className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              {submission
                ? "Retake Assessment"
                : t("assessmentsPage.start.startButton")}
            </button>
          )}
        </div>
        {showStartConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4">
            <div className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6 md:h-[70vh] md:w-[80vw] md:p-10">
              <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-start text-center md:justify-center">
                <TriangleAlert className="mb-3 h-11 w-11 shrink-0 text-red-600 sm:mb-5 sm:h-16 sm:w-16" />
                <h2 className="text-2xl font-extrabold text-card-foreground sm:text-3xl md:text-4xl">
                  Start assessment?
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-card-foreground sm:mt-5 sm:text-lg sm:leading-8 md:text-xl">
                  Once you start, the assessment timer will continue running
                  until your attempt is submitted.
                </p>
                <div className="mt-4 rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300 sm:mt-6 sm:p-5 md:p-7">
                  <p className="text-base font-extrabold leading-6 sm:text-xl sm:leading-8 md:text-2xl md:leading-10">
                    Warning: If you switch tabs, minimize or leave this window,
                    refresh the page, or open another screen or application,
                    your current answers will be submitted automatically and
                    your assessment attempt will end immediately.
                  </p>
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-muted-foreground sm:mt-5 sm:text-base md:text-lg">
                  You may not be able to resume the attempt after auto-submission.
                  Please stay on this screen until you finish.
                </p>
              </div>
              <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:mt-8 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowStartConfirm(false)}
                  className="w-full rounded-lg border border-border px-5 py-3 text-sm font-semibold hover:bg-muted sm:w-auto sm:px-6 sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStartConfirm(false);
                    setStarted(true);
                  }}
                  className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto sm:px-6 sm:text-base"
                >
                  I understand — start assessment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <BackButton />

      {assessment.type === "MCQ" && (
        <McqAssessment assessment={assessment as any} questions={questions as any} />
      )}

      {assessment.type === "WRITTEN" && (
        <WrittenAssessment
          assessment={assessment as any}
          questions={questions as any}
          userId=""
        />
      )}

      {assessment.type === "PRACTICAL" && (
        <PracticalAssessment assessment={assessment as any} userId="" />
      )}

      {assessment.type === "MIXED" && (
        <McqAssessment assessment={assessment as any} questions={questions as any} />
      )}

      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-xl font-bold text-card-foreground">
              Leave assessment?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              If you go back now, your current answers will be auto-submitted
              before leaving this assessment.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBackConfirm(false)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBackConfirm(false);
                  window.dispatchEvent(
                    new CustomEvent("learner-assessment-auto-submit-request", {
                      detail: {
                        reason: "back",
                        onSubmitted: () => router.back(),
                      },
                    }),
                  );
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Agree &amp; go back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
