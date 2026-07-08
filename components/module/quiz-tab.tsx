"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LearnerQuiz } from "@/lib/learner-module-types";

type QuizResult = {
  passed: boolean;
  score: number;
  passingScore: number;
  courseId?: string;
  nextModuleId?: string | null;
};

function readSavedQuizState(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as {
      answers?: Record<string, number>;
      result?: QuizResult | null;
      submittedAt?: string | null;
    };

    if (!parsed.answers) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export default function QuizTab({
  quiz,
  unlocked,
  userId,
  onPassed,
}: {
  quiz: LearnerQuiz;
  unlocked: boolean;
  userId: string;
  onPassed?: () => void;
}) {
  const t = useTranslations();
  const storageKey = `quiz-submission:${userId}:${quiz.moduleId}`;
  const savedState = readSavedQuizState(storageKey);

  const [answers, setAnswers] = useState<Record<string, number>>(
    savedState?.answers ?? {},
  );
  const [submitted, setSubmitted] = useState(Boolean(savedState?.submittedAt));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(
    savedState?.result ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentState = readSavedQuizState(storageKey);
    if (!currentState) return;

    setAnswers(currentState.answers ?? {});
    setResult(currentState.result ?? null);
    setSubmitted(Boolean(currentState.submittedAt));
  }, [storageKey]);

  useEffect(() => {
    if (submitted) return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        answers,
        result: result ?? null,
        submittedAt: null,
      }),
    );
  }, [answers, result, storageKey, submitted]);

  if (!unlocked && !submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="h-5 w-5" />
        </span>

        <p className="font-semibold text-card-foreground">
          {t("learner.quizTab.locked")}
        </p>

        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          {t("learner.quizTab.lockedMessage")}
        </p>
      </div>
    );
  }

  const questions = quiz.questions ?? [];
  const allAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  async function submitQuiz() {
    if (submitted) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/learner/courses/${quiz.courseId}/modules/${quiz.moduleId}/quiz-submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ answers }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit quiz.");
      }

      setResult(data);
      setSubmitted(true);
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          result: data,
          submittedAt: new Date().toISOString(),
        }),
      );

      if (data.passed) {
        onPassed?.();
        setTimeout(() => {
          if (data.nextModuleId) {
            window.location.href = `/courses/${data.courseId}/module/${data.nextModuleId}`;
          } else {
            window.location.href = `/courses/${data.courseId}`;
          }
        }, 800);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && result) {
    return (
      <div className="space-y-6">
        <div className="space-y-5 rounded-lg border border-border bg-card p-8 text-center">
          {result.passed ? (
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
          )}

          <h2 className="text-xl font-bold text-card-foreground">
            {result.passed
              ? t("learner.practiceQuiz.passed")
              : t("learner.practiceQuiz.failed")}
          </h2>

          <p className="text-sm text-muted-foreground">
            This quiz is saved. You can review your submitted answers below, but you cannot submit again.
          </p>

          <div className="rounded-lg bg-muted p-5">
            <p className="text-3xl font-bold text-primary">{result.score}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("learner.practiceQuiz.passingScore", {
                score: result.passingScore,
              })}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="space-y-4 rounded-lg border border-border bg-card p-5"
            >
              <h3 className="text-base font-bold text-card-foreground">
                {t("learner.practiceQuiz.question", {
                  number: questionIndex + 1,
                })}
              </h3>

              <p className="text-sm text-muted-foreground">{question.question}</p>

              <div className="space-y-2.5">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 opacity-90"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      className="h-4 w-4"
                      checked={answers[question.id] === optionIndex}
                      disabled
                      readOnly
                    />
                    <span className="text-sm text-card-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questions.map((question, questionIndex) => (
        <div
          key={question.id}
          className="space-y-4 rounded-lg border border-border bg-card p-5"
        >
          <h3 className="text-base font-bold text-card-foreground">
            {t("learner.practiceQuiz.question", {
              number: questionIndex + 1,
            })}
          </h3>

          <p className="text-sm text-muted-foreground">{question.question}</p>

          <div className="space-y-2.5">
            {question.options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted"
              >
                <input
                  type="radio"
                  name={question.id}
                  className="h-4 w-4"
                  checked={answers[question.id] === optionIndex}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: optionIndex,
                    }))
                  }
                />

                <span className="text-sm text-card-foreground">{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!allAnswered || submitting || submitted}
        onClick={submitQuiz}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {submitted ? "Submitted" : t("learner.practiceQuiz.submitQuiz")}
      </button>
    </div>
  );
}
