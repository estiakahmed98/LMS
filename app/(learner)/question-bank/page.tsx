"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LibraryBig, LoaderCircle } from "lucide-react";
import { parseApiJson } from "@/lib/parse-api-json";

interface LearnerPaperSummary {
  id: string;
  title: string;
  courseTitle: string | null;
  moduleTitle: string | null;
  examTypeName: string | null;
  examYear: number | null;
  questionCount: number;
  totalMarks: number;
  questionTypes: string[];
}

export default function LearnerQuestionBankPage() {
  const [papers, setPapers] = useState<LearnerPaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/learner/question-bank/papers", {
          cache: "no-store",
        });
        const data = await parseApiJson<{
          papers?: LearnerPaperSummary[];
          error?: string;
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Failed to load papers.");
        setPapers(data.papers ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load papers.");
        setPapers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading question bank…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 p-2 md:p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LibraryBig className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Question Bank</h1>
          <p className="text-sm text-muted-foreground">
            Published papers available for your enrolled courses.
          </p>
        </div>
      </div>

      {papers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No published papers are available yet.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {papers.map((paper) => (
            <Link
              key={paper.id}
              href={`/question-bank/papers/${paper.id}`}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              <h2 className="font-semibold text-card-foreground">{paper.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {paper.courseTitle ?? "General"}
                {paper.moduleTitle ? ` · ${paper.moduleTitle}` : ""}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {paper.questionCount} questions · {paper.totalMarks} marks
                {paper.examYear ? ` · ${paper.examYear}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
