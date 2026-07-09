"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Timer,
  ScanLine,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Assessment, Question } from "@/lib/mock-data";
import CameraViewfinder from "./camera-viewfinder";

const QUESTIONS_PER_PAGE = 10;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function McqAssessment({
  assessment,
  questions,
}: {
  assessment: Assessment;
  questions: Question[];
}) {
  const router = useRouter();
  const t = useTranslations();
  const [mode, setMode] = useState<"digital" | "scan">("digital");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const totalPages = Math.max(
    1,
    Math.ceil(questions.length / QUESTIONS_PER_PAGE),
  );
  const pageQuestions = questions.slice(
    page * QUESTIONS_PER_PAGE,
    page * QUESTIONS_PER_PAGE + QUESTIONS_PER_PAGE,
  );

  function goToQuestion(index: number) {
    setActiveQuestion(index);
    setPage(Math.floor(index / QUESTIONS_PER_PAGE));
  }

  useEffect(() => {
    if (mode !== "digital") return;
    const interval = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, [mode]);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined,
  ).length;

  async function handleSubmit(payload?: {
    answers?: Record<string, string>;
    attachments?: string[];
  }) {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/learner/assessments/${assessment.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "MCQ",
          answers: payload?.answers ?? answers,
          attachments: payload?.attachments ?? [],
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to submit assessment.");
      }

      router.push(
        `/assessments/${assessment.id}/result?submissionId=${result.submission.id}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1 gap-4">
        <h1 className="text-3xl font-bold">{assessment.title}</h1>
        <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
          <button
            onClick={() => setMode("digital")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "digital"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t("assessmentTaking.mcq.onScreen")}
          </button>
          <button
            onClick={() => setMode("scan")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "scan"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t("assessmentTaking.mcq.scanOmr")}
          </button>
        </div>
      </div>
      <p className="text-muted-foreground mb-8">
        {t("assessmentTaking.mcq.questionsMarksSummary", {
          count: questions.length,
          plural: questions.length !== 1 ? "s" : "",
          marks: assessment.totalMarks,
          passingMarks: assessment.passingMarks,
        })}
      </p>

      {mode === "digital" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-6">
            {pageQuestions.map((q, pageIndex) => {
              const index = page * QUESTIONS_PER_PAGE + pageIndex;
              return (
                <div
                  key={q.id}
                  onFocus={() => setActiveQuestion(index)}
                  className="bg-card border border-border rounded-lg p-6 space-y-6"
                >
                  <h2 className="text-xl font-bold text-card-foreground">
                    {t("assessmentTaking.mcq.questionWithMarks", {
                      number: index + 1,
                      marks: q.marks,
                    })}
                  </h2>
                  <p className="text-muted-foreground">{q.question}</p>

                  <div className="space-y-3">
                    {(q.options ?? []).map((opt, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="w-4 h-4"
                          checked={answers[q.id] === opt}
                          onChange={() => {
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                            setActiveQuestion(index);
                          }}
                        />
                        <span className="text-card-foreground">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-4 bg-card border border-border rounded-lg px-4 py-3">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("assessmentTaking.mcq.previous")}
                </button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 rounded-md text-sm font-semibold transition-colors ${
                        i === page
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t("assessmentTaking.mcq.next")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start bg-card border border-border rounded-lg p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                {t("assessmentTaking.mcq.timeRemaining")}
              </p>
              <div className="flex items-center gap-2 text-destructive">
                <Timer className="w-6 h-6" />
                <span className="text-3xl font-bold tabular-nums">
                  {formatTime(secondsLeft)}
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {t("assessmentTaking.mcq.progressAnswered", {
                  answered: answeredCount,
                  total: questions.length,
                })}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isActive = index === activeQuestion;
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`aspect-square rounded-lg text-sm font-semibold flex items-center justify-center transition-colors ${
                        isActive
                          ? "bg-destructive text-white"
                          : isAnswered
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={!allAnswered || submitting}
              onClick={() => void handleSubmit()}
              className="w-full px-6 py-3 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? t("assessmentTaking.written.saving")
                : t("assessmentTaking.mcq.submitAssessment")}
            </button>
          </div>
        </div>
      ) : (
        <OmrScanner assessment={assessment} onSubmit={handleSubmit} />
      )}
    </div>
  );
}

function OmrScanner({
  assessment,
  onSubmit,
}: {
  assessment: Assessment;
  onSubmit: (payload: { answers?: Record<string, string>; attachments?: string[] }) => Promise<void>;
}) {
  const t = useTranslations();
  const [stage, setStage] = useState<"capture" | "processing">("capture");

  async function handleCapture(dataUrl: string) {
    setStage("processing");
    await new Promise((resolve) => setTimeout(resolve, 900));
    await onSubmit({
      answers: {},
      attachments: [dataUrl],
    });
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        {t("assessmentTaking.mcq.omr.intro")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" />
            {t("assessmentTaking.mcq.omr.step1Title")}
          </h3>
          <CameraViewfinder
            label={t("assessmentTaking.mcq.omr.alignCorners")}
            onCapture={handleCapture}
            outline="sheet"
          />
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3">
            {t("assessmentTaking.mcq.omr.step2Title")}
          </h3>
          <div className="aspect-4/3 rounded-xl bg-muted flex flex-col items-center justify-center text-center gap-3 p-4">
            {stage === "processing" ? (
              <>
                <Loader2 className="w-14 h-14 text-destructive animate-spin" />
                <p className="font-semibold text-card-foreground">
                  {t("assessmentTaking.mcq.omr.analyzing")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("assessmentTaking.mcq.omr.analyzingDetail")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("assessmentTaking.mcq.omr.waitingForScan")}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3">
            {t("assessmentTaking.mcq.omr.step3Title")}
          </h3>
          {stage === "processing" ? (
            <div className="aspect-4/3 rounded-xl bg-muted flex flex-col items-center justify-center text-center gap-3 p-4">
              <Loader2 className="w-14 h-14 text-destructive animate-spin" />
              <p className="font-semibold text-card-foreground">
                {t("assessmentTaking.mcq.omr.analyzing")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("assessmentTaking.mcq.omr.analyzingDetail")}
              </p>
            </div>
          ) : (
            <div className="aspect-4/3 rounded-xl bg-muted flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground text-center">
                {t("assessmentTaking.mcq.omr.resultPlaceholder")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
