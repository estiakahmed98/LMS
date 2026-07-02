"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Timer, ScanLine, Loader2, CheckCircle2 } from "lucide-react";
import type { Assessment, Question } from "@/lib/mock-data";
import CameraViewfinder from "./camera-viewfinder";

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
  const [mode, setMode] = useState<"digital" | "scan">("digital");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);

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

  function handleSubmit() {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const obtainedMarks = questions.reduce(
      (sum, q) => sum + (answers[q.id] === q.correctAnswer ? q.marks : 0),
      0,
    );
    const scorePercent =
      totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

    router.push(
      `/assessments/${assessment.id}/result?score=${scorePercent}&passing=${Math.round(
        (assessment.passingMarks / assessment.totalMarks) * 100,
      )}`,
    );
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
            On-Screen
          </button>
          <button
            onClick={() => setMode("scan")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === "scan"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            Scan OMR Sheet
          </button>
        </div>
      </div>
      <p className="text-muted-foreground mb-8">
        {questions.length} question{questions.length !== 1 ? "s" : ""} ·{" "}
        {assessment.totalMarks} marks · Pass at {assessment.passingMarks} marks
      </p>

      {mode === "digital" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div
                key={q.id}
                onFocus={() => setActiveQuestion(index)}
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
            ))}
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start bg-card border border-border rounded-lg p-5 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Time Remaining
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
                Progress · {answeredCount}/{questions.length} Answered
              </p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isActive = index === activeQuestion;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestion(index)}
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
              disabled={!allAnswered}
              onClick={handleSubmit}
              className="w-full px-6 py-3 bg-destructive text-white rounded-full hover:bg-destructive/90 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Assessment
            </button>
          </div>
        </div>
      ) : (
        <OmrScanner assessment={assessment} questions={questions} />
      )}
    </div>
  );
}

function OmrScanner({
  assessment,
  questions,
}: {
  assessment: Assessment;
  questions: Question[];
}) {
  const [stage, setStage] = useState<"capture" | "processing" | "result">(
    "capture",
  );
  const [result, setResult] = useState<{
    percent: number;
    correct: number;
  } | null>(null);

  function handleCapture() {
    setStage("processing");
    setTimeout(() => {
      const total = questions.length || 20;
      const correct = Math.max(
        1,
        Math.round(total * (0.7 + Math.random() * 0.25)),
      );
      const percent = Math.round((correct / total) * 100);
      setResult({ percent, correct });
      setStage("result");
    }, 1800);
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        4-corner alignment scan of a printed OMR sheet, auto-processed into a
        graded result.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" />
            1. Align &amp; Capture OMR Sheet
          </h3>
          <CameraViewfinder
            label="Align All 4 Corners"
            onCapture={handleCapture}
            outline="sheet"
          />
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3">
            2. Processing
          </h3>
          <div className="aspect-4/3 rounded-xl bg-muted flex flex-col items-center justify-center text-center gap-3 p-4">
            {stage === "processing" ? (
              <>
                <Loader2 className="w-14 h-14 text-destructive animate-spin" />
                <p className="font-semibold text-card-foreground">
                  Analyzing sheet...
                </p>
                <p className="text-xs text-muted-foreground">
                  Matching bubble positions against the answer key and
                  calculating marks.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Waiting for a scan to process.
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-card-foreground mb-3">
            3. Scanned Result
          </h3>
          {stage === "result" && result ? (
            <div className="aspect-4/3 rounded-xl bg-green-500/10 flex flex-col items-center justify-center text-center gap-2 p-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <p className="text-5xl font-bold text-green-600">
                {result.percent}%
              </p>
              <p className="text-xs text-muted-foreground">
                {result.correct} of {questions.length || 20} correct ·
                auto-graded
              </p>
              <p className="text-[10px] text-muted-foreground">
                Scanned sheet · OMR-S-{assessment.id.slice(-4).toUpperCase()}
              </p>
            </div>
          ) : (
            <div className="aspect-4/3 rounded-xl bg-muted flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground text-center">
                Result will appear here after processing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
