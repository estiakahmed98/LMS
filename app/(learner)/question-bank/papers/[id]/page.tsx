"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, LoaderCircle } from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-json";

interface LearnerPaperDetail {
  id: string;
  title: string;
  specialInstructions: string | null;
  examYear: number | null;
  courseTitle: string | null;
  moduleTitle: string | null;
  examTypeName: string | null;
  questionCount: number;
  totalMarks: number;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options: string[];
    difficulty: string;
    marks: number | null;
    order: number;
  }>;
}

export default function LearnerQuestionBankPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [paper, setPaper] = useState<LearnerPaperDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/learner/question-bank/papers/${id}`, {
          cache: "no-store",
        });
        const data = await parseApiJson<{
          paper?: LearnerPaperDetail;
          error?: string;
        }>(res);
        if (!res.ok || !data.paper) {
          throw new Error(data.error ?? "Failed to load paper.");
        }
        setPaper(data.paper);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load paper.");
        setPaper(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading paper…
      </div>
    );
  }

  if (error || !paper) {
    return <div className="p-6 text-sm text-red-600">{error ?? "Paper not found."}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <Link
        href="/question-bank"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Question Bank
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{paper.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {paper.courseTitle ?? "General"}
          {paper.moduleTitle ? ` · ${paper.moduleTitle}` : ""}
          {paper.examTypeName ? ` · ${paper.examTypeName}` : ""}
          {paper.examYear ? ` · ${paper.examYear}` : ""}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {paper.questionCount} questions · {paper.totalMarks} marks
        </p>
      </div>

      {paper.specialInstructions && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {paper.specialInstructions}
        </div>
      )}

      <div className="space-y-4">
        {paper.questions.map((question, index) => (
          <div
            key={question.id}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                Question {index + 1}
              </p>
              <p className="text-xs text-muted-foreground">
                {question.type} · {question.difficulty}
                {question.marks != null ? ` · ${question.marks} marks` : ""}
              </p>
            </div>
            <p className="text-sm text-card-foreground">{question.question}</p>
            {question.options.length > 0 && (
              <ul className="space-y-2">
                {question.options.map((option) => (
                  <li
                    key={option}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground"
                  >
                    {option}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
