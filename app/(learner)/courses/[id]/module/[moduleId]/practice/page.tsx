"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { getCurrentUser } from "@/lib/auth";
import { getQuizForModule, type Quiz } from "@/lib/mock-modules";

export default function ModulePracticeQuizPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>;
}) {
  const { id, moduleId } = use(params);
  const t = useTranslations();
  const currentUser = getCurrentUser("/courses");

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getQuizForModule(id, moduleId, currentUser?.id).then((data) => {
      if (cancelled) return;
      if (!data) {
        setQuiz(null);
      } else {
        setQuiz(data.quiz);
        setCourseTitle(data.course.title);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, id, moduleId]);

  if (loading) return null;
  if (!quiz) notFound();

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const correctCount = quiz.questions.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;
  const scorePercent = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = scorePercent >= quiz.passingScore;

  return (
    <div className="px-6 py-8">
      <Link
        href={`/courses/${id}/module/${moduleId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft size={16} />
        {t("learner.practiceQuiz.backToModule", { moduleTitle: quiz.moduleTitle })}
      </Link>

      <p className="text-xs font-semibold text-primary mb-1">
        {t("learner.practiceQuiz.courseHeader", {
          courseTitle: courseTitle.toUpperCase(),
        })}
      </p>
      <h1 className="text-2xl font-bold mb-6">{quiz.moduleTitle}</h1>

      {submitted ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
          {passed ? (
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
          ) : (
            <XCircle className="w-20 h-20 text-red-500 mx-auto" />
          )}
          <h2 className="text-2xl font-bold text-card-foreground">
            {passed
              ? t("learner.practiceQuiz.passed")
              : t("learner.practiceQuiz.failed")}
          </h2>
          <p className="text-muted-foreground">
            {t("learner.practiceQuiz.scoreSummary", {
              correctCount,
              total: quiz.questions.length,
            })}
          </p>
          <div className="bg-muted rounded-lg p-6">
            <p className="text-4xl font-bold text-primary">{scorePercent}%</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("learner.practiceQuiz.passingScore", {
                score: quiz.passingScore,
              })}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            {!passed && (
              <button
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="px-6 py-2.5 border border-border rounded-lg font-semibold hover:bg-muted transition-colors"
              >
                {t("learner.practiceQuiz.retryQuiz")}
              </button>
            )}
            <Link
              href={`/courses/${id}/module/${moduleId}`}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold transition-colors"
            >
              {t("learner.practiceQuiz.backToModuleButton")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {quiz.questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="bg-card border border-border rounded-lg p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-card-foreground">
                {t("learner.practiceQuiz.question", { number: qIndex + 1 })}
              </h2>
              <p className="text-muted-foreground">{q.question}</p>

              <div className="space-y-3">
                {q.options.map((opt, optIndex) => (
                  <label
                    key={optIndex}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      className="w-4 h-4"
                      checked={answers[q.id] === optIndex}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: optIndex }))
                      }
                    />
                    <span className="text-card-foreground">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("learner.practiceQuiz.submitQuiz")}
          </button>
        </div>
      )}
    </div>
  );
}
