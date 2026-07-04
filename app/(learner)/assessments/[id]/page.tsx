"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getAssessmentById,
  getQuestionsByAssessmentId,
  type AssessmentType,
} from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/auth";
import McqAssessment from "@/components/assessment/mcq-assessment";
import WrittenAssessment from "@/components/assessment/written-assessment";
import PracticalAssessment from "@/components/assessment/practical-assessment";
import {
  ArrowLeft,
  Clock,
  FileText,
  ListChecks,
  FlaskConical,
} from "lucide-react";

export default function AssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const t = useTranslations();

  const assessment = getAssessmentById(id);
  const questions = getQuestionsByAssessmentId(id);
  const currentUser = getCurrentUser();

  const [started, setStarted] = useState(false);

  if (!assessment) notFound();

  const userId = currentUser?.id ?? "";

  // ---------- Back button (shown on both start screen & assessment view) ----------
  const BackButton = () => (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      {t("assessmentsPage.back")}
    </button>
  );

  // ---------- Start screen (timer NOT started yet) ----------
  if (!started) {
    const typeMetaMap: Partial<
      Record<AssessmentType, { icon: typeof FileText; label: string }>
    > = {
      MCQ: { icon: ListChecks, label: t("assessmentsPage.start.typeLabels.MCQ") },
      WRITTEN: {
        icon: FileText,
        label: t("assessmentsPage.start.typeLabels.WRITTEN"),
      },
      PRACTICAL: {
        icon: FlaskConical,
        label: t("assessmentsPage.start.typeLabels.PRACTICAL"),
      },
    };
    const typeMeta = typeMetaMap[assessment.type] ?? {
      icon: FileText,
      label: assessment.type,
    };

    const Icon = typeMeta.icon;

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

          <div className="flex items-center gap-6 text-sm text-muted-foreground mt-2">
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

          <button
            onClick={() => setStarted(true)}
            className="mt-4 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            {t("assessmentsPage.start.startButton")}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actual assessment (timer starts here) ----------
  return (
    <div>
      <BackButton />

      {assessment.type === "MCQ" && (
        <McqAssessment assessment={assessment} questions={questions} />
      )}

      {assessment.type === "WRITTEN" && (
        <WrittenAssessment
          assessment={assessment}
          questions={questions}
          userId={userId}
        />
      )}

      {assessment.type === "PRACTICAL" && (
        <PracticalAssessment assessment={assessment} userId={userId} />
      )}
    </div>
  );
}
