"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { parseQuestionsFromText } from "@/lib/assessment-question-parser";
import type { AdminExtractedQuestion } from "@/lib/admin-assessment-types";

const SAMPLE = `###QUESTION_START###
Question 1
Who is the writer of the story "Subha"?

A. Sarat Chandra Chattopadhyay
B. Rabindranath Tagore
C. Bibhutibhushan Bandyopadhyay
D. Manik Bandyopadhyay

Answer: B
Marks: 5
Time: 2
Difficulty: Medium
###QUESTION_END###`;

export default function AiQuestionImport({
  disabled,
  onImport,
}: {
  disabled?: boolean;
  onImport: (questions: AdminExtractedQuestion[]) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = text.trim() ? parseQuestionsFromText(text) : [];

  async function handleImport() {
    const parsed = parseQuestionsFromText(text);
    if (parsed.length === 0) {
      setError(
        "No questions detected. Use Question 1, A-D options, and Answer lines.",
      );
      return;
    }
    try {
      setBusy(true);
      setError("");
      await onImport(parsed);
      setOpen(false);
      setText("");
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Failed to import questions.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        AI Auto-fill
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-card-foreground">
                  AI Auto-fill - paste questions
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Paste OCR-friendly question text
                </label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={SAMPLE}
                  rows={14}
                  className="min-h-70 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use <code>Question 1</code>, options as <code>A.</code>{" "}
                  through <code>D.</code>, then <code>Answer:</code>,{" "}
                  <code>Marks:</code>, <code>Time:</code>, and{" "}
                  <code>Difficulty:</code>. Optional markers{" "}
                  <code>###QUESTION_START###</code> and{" "}
                  <code>###QUESTION_END###</code> improve OCR accuracy.
                </p>
              </div>

              <QuestionPreview questions={preview} />
            </div>

            {error && (
              <p className="border-t border-border px-5 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleImport()}
                disabled={busy || preview.length === 0}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Import {preview.length} question
                {preview.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function QuestionPreview({
  questions,
}: {
  questions: AdminExtractedQuestion[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-muted-foreground">
        Preview ({questions.length} question{questions.length === 1 ? "" : "s"})
      </label>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Parsed questions will appear here.
          </p>
        ) : (
          questions.map((question, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-card p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  {index + 1}. {question.question}
                </p>
                <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {question.type} | {question.marks}m |{" "}
                  {question.timeLimitMinutes ?? 2}min
                </span>
              </div>
              {question.options.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {question.options.map((option, optionIndex) => (
                    <li
                      key={optionIndex}
                      className={
                        question.correctAnswer === option
                          ? "font-semibold text-green-600"
                          : ""
                      }
                    >
                      {String.fromCharCode(65 + optionIndex)}. {option}
                      {question.correctAnswer === option && " (correct)"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
