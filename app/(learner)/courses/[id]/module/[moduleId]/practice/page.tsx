"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, XCircle, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LearnerQuiz } from "@/lib/learner-module-types";

type ModuleDetailResponse = {
  course: {
    title: string;
  };
  module: {
    title: string;
  };
  quiz: LearnerQuiz | null;
};

export default function ModulePracticeQuizPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = use(params);
  const t = useTranslations();

  const [quiz, setQuiz] = useState<LearnerQuiz | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    passed: boolean;
    score: number;
    passingScore: number;
    courseId?: string;
    nextModuleId?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/learner/courses/${id}/modules/${moduleId}`,
          { cache: "no-store" },
        );

        const data = (await response.json().catch(() => null)) as
          | ModuleDetailResponse
          | { error?: string }
          | null;

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load quiz.");
        }

        if (cancelled) return;

        if (!data || !("quiz" in data) || !data.quiz) {
          setQuiz(null);
        } else {
          setQuiz(data.quiz);
          setCourseTitle(data.course.title);
          setModuleTitle(data.module.title);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load quiz.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [id, moduleId]);

  if (loading) {
    return (
      <div className="px-6 py-20 text-center">
        <LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="mb-2 text-xl font-bold">Quiz unavailable</h1>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <Link
          href={`/courses/${id}/module/${moduleId}`}
          className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Back to Module
        </Link>
      </div>
    );
  }

  if (!quiz) {
    notFound();
  }

  const questions = quiz.questions ?? [];
  const allAnswered =
    questions.length > 0 && questions.every((question) => answers[question.id] !== undefined);
  const correctCount = questions.filter(
    (question) => answers[question.id] === question.correctIndex,
  ).length;
  const scorePercent = Math.round((correctCount / questions.length) * 100);
  const passed = scorePercent >= quiz.passingScore;

  async function submitQuiz() {
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

      if (data.passed) {
        setTimeout(() => {
          if (data.nextModuleId) {
            window.location.href = `/courses/${data.courseId}/module/${data.nextModuleId}`;
          } else {
            window.location.href = `/courses/${data.courseId}`;
          }
        }, 800);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to submit quiz.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-8">
      <Link
        href={`/courses/${id}/module/${moduleId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        {t("learner.practiceQuiz.backToModule", {
          moduleTitle,
        })}
      </Link>

      <p className="mb-1 text-xs font-semibold text-primary">
        {t("learner.practiceQuiz.courseHeader", {
          courseTitle: courseTitle.toUpperCase(),
        })}
      </p>
      <h1 className="mb-6 text-2xl font-bold">{moduleTitle}</h1>

      {submitted && result ? (
        <div className="space-y-6 rounded-lg border border-border bg-card p-8 text-center">
          {result.passed ? (
            <CheckCircle2 className="mx-auto h-20 w-20 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-20 w-20 text-red-500" />
          )}

          <h2 className="text-2xl font-bold text-card-foreground">
            {result.passed
              ? t("learner.practiceQuiz.passed")
              : t("learner.practiceQuiz.failed")}
          </h2>

          <p className="text-muted-foreground">
            {t("learner.practiceQuiz.scoreSummary", {
              correctCount,
              total: questions.length,
            })}
          </p>

          <div className="rounded-lg bg-muted p-6">
            <p className="text-4xl font-bold text-primary">{scorePercent}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("learner.practiceQuiz.passingScore", {
                score: quiz.passingScore,
              })}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            {!result.passed && (
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setResult(null);
                }}
                className="rounded-lg border border-border px-6 py-2.5 font-semibold transition-colors hover:bg-muted"
              >
                {t("learner.practiceQuiz.retryQuiz")}
              </button>
            )}

            <Link
              href={`/courses/${id}/module/${moduleId}`}
              className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              {t("learner.practiceQuiz.backToModuleButton")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="space-y-4 rounded-lg border border-border bg-card p-6"
            >
              <h2 className="text-lg font-bold text-card-foreground">
                {t("learner.practiceQuiz.question", {
                  number: questionIndex + 1,
                })}
              </h2>

              <p className="text-muted-foreground">{question.question}</p>

              <div className="space-y-3">
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
                    <span className="text-card-foreground">{option}</span>
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
            disabled={!allAnswered || submitting}
            onClick={submitQuiz}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {t("learner.practiceQuiz.submitQuiz")}
          </button>
        </div>
      )}
    </div>
  );
}
