"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import McqAssessment from "@/components/assessment/mcq-assessment";
import WrittenAssessment from "@/components/assessment/written-assessment";
import PracticalAssessment from "@/components/assessment/practical-assessment";
import { ArrowLeft, Clock, FileText, ListChecks, FlaskConical, LoaderCircle } from "lucide-react";
import type { LearnerAssessmentDetail } from "@/lib/learner-assessment-types";

export default function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const [detail, setDetail] = useState<LearnerAssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

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
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      {t("assessmentsPage.back")}
    </button>
  );

  const assessment = detail.assessment;
  const questions = detail.questions;
  const submission = detail.submission;

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
          </div>

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
            </div>
          ) : null}

          <button
            onClick={() => setStarted(true)}
            className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            {submission ? "Retake Assessment" : t("assessmentsPage.start.startButton")}
          </button>
        </div>
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
    </div>
  );
}
