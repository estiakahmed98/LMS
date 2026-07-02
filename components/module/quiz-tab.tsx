"use client";

import { useState } from "react";
import { Lock, CheckCircle2, XCircle } from "lucide-react";
import type { Quiz } from "@/lib/mock-modules";

export default function QuizTab({
  quiz,
  unlocked,
}: {
  quiz: Quiz;
  unlocked: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border rounded-xl">
        <span className="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-3">
          <Lock className="w-5 h-5" />
        </span>
        <p className="font-semibold text-card-foreground">Quiz locked</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Finish watching the video to unlock this quiz.
        </p>
      </div>
    );
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const correctCount = quiz.questions.filter(
    (q) => answers[q.id] === q.correctIndex,
  ).length;
  const scorePercent = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = scorePercent >= quiz.passingScore;

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center space-y-5">
        {passed ? (
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        ) : (
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        )}
        <h2 className="text-xl font-bold text-card-foreground">
          {passed ? "Well done!" : "Not quite there yet"}
        </h2>
        <p className="text-sm text-muted-foreground">
          You got {correctCount} of {quiz.questions.length} questions correct.
        </p>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-3xl font-bold text-primary">{scorePercent}%</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Passing score: {quiz.passingScore}%
          </p>
        </div>
        {!passed && (
          <button
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            className="px-6 py-2.5 border border-border rounded-lg font-semibold text-sm hover:bg-muted transition-colors"
          >
            Retry Quiz
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {quiz.questions.map((q, qIndex) => (
        <div
          key={q.id}
          className="bg-card border border-border rounded-lg p-5 space-y-4"
        >
          <h3 className="text-base font-bold text-card-foreground">
            Question {qIndex + 1}
          </h3>
          <p className="text-sm text-muted-foreground">{q.question}</p>

          <div className="space-y-2.5">
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
                <span className="text-sm text-card-foreground">{opt}</span>
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
        Submit Quiz
      </button>
    </div>
  );
}
