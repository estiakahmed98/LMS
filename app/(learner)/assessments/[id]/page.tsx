"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  getAssessmentById,
  getQuestionsByAssessmentId,
} from "@/lib/mock-data";

export default function MCQAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const assessment = getAssessmentById(id);
  const questions = getQuestionsByAssessmentId(id);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!assessment) notFound();

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  function handleSubmit() {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const obtainedMarks = questions.reduce(
      (sum, q) => sum + (answers[q.id] === q.correctAnswer ? q.marks : 0),
      0,
    );
    const scorePercent =
      totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

    router.push(
      `/assessments/${id}/result?score=${scorePercent}&passing=${assessment ? Math.round((assessment.passingMarks / assessment.totalMarks) * 100) : 0}`,
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">{assessment.title}</h1>
      <p className="text-muted-foreground mb-8">
        {questions.length} question{questions.length !== 1 ? "s" : ""} ·{" "}
        {assessment.totalMarks} marks · Pass at {assessment.passingMarks} marks
      </p>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="bg-card border border-border rounded-lg p-6 space-y-6"
          >
            <h2 className="text-xl font-bold text-card-foreground">
              Question {index + 1}
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
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: opt }))
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
          onClick={handleSubmit}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Assessment
        </button>
      </div>
    </div>
  );
}
