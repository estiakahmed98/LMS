"use client";

import { useState } from "react";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import FormatDisclaimer from "@/components/admin/QuestionImportFormatDisclaimer";
import {
  coerceQuestionsToType,
  parseQuestionsFromText,
} from "@/lib/assessment-question-parser";
import type {
  AdminExtractedQuestion,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";
import { getCqPartLabel } from "@/lib/question-bank-cq";
import { useLocale } from "next-intl";

const SAMPLE_MCQ = `###QUESTION_START###
Question 1
Which of the following are programming languages?

A. JavaScript
B. Python
C. HTML
D. Java

Answer: A, B, D
Marks: 5
Time: 2
Difficulty: Medium
###QUESTION_END###`;

const SAMPLE_WRITTEN = `###QUESTION_START###
Creative Question 1
Write the question or passage here.

A. First optional sub-question [2 marks]
B. Second optional sub-question [3 marks]
C. Third optional sub-question [5 marks]

Time: 15
Difficulty: Medium
###QUESTION_END###`;

export default function AiQuestionImport({
  disabled,
  assessmentType,
  onImport,
}: {
  disabled?: boolean;
  assessmentType: QuestionTypeValue;
  onImport: (questions: AdminExtractedQuestion[]) => Promise<void> | void;
}) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isWritten =
    assessmentType === "WRITTEN" || assessmentType === "PRACTICAL";

  const preview = text.trim()
    ? coerceQuestionsToType(parseQuestionsFromText(text), assessmentType)
    : [];

  async function handleImport() {
    const parsed = coerceQuestionsToType(
      parseQuestionsFromText(text),
      assessmentType,
    );

    if (parsed.length === 0) {
      setError(
        isWritten
          ? "No questions detected. Start each question with Question 1, Question 2, ..."
          : "No questions detected. Use Question 1, A-D options, and Answer lines.",
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
        onClick={() => setDisclaimerOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" />
        AI Auto-fill
      </button>

      {disclaimerOpen && (
        <FormatDisclaimer
          icon={<Sparkles className="h-5 w-5 text-primary" />}
          title="Before you use AI Auto-fill"
          variant="assessment"
          format={isWritten ? "CQ" : "MCQ"}
          onCancel={() => setDisclaimerOpen(false)}
          onAccept={() => {
            setDisclaimerOpen(false);
            setOpen(true);
          }}
        />
      )}

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
                  placeholder={isWritten ? SAMPLE_WRITTEN : SAMPLE_MCQ}
                  rows={14}
                  className="min-h-70 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                />

                {isWritten ? (
                  <p className="text-xs text-muted-foreground">
                    A question may contain only a directly answerable passage,
                    or any number of sub-questions labeled <code>A.</code>,{" "}
                    <code>B.</code>, <code>C.</code> or <code>ক.</code>,{" "}
                    <code>খ.</code>, <code>গ.</code>. Put each part&apos;s marks
                    at the end, such as <code>[3 marks]</code>. Optional markers{" "}
                    <code>###QUESTION_START###</code> and{" "}
                    <code>###QUESTION_END###</code> improve OCR accuracy.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Use <code>Question 1</code>, options as <code>A.</code>{" "}
                    through <code>D.</code>, then <code>Answer:</code>,{" "}
                    <code>Marks:</code>, <code>Time:</code>, and{" "}
                    <code>Difficulty:</code>. For multiple correct answers use
                    formats such as <code>Answer: A, C</code> or{" "}
                    <code>Answer: A, B, D</code>. Optional markers{" "}
                    <code>###QUESTION_START###</code> and{" "}
                    <code>###QUESTION_END###</code> improve OCR accuracy.
                  </p>
                )}
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
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-muted-foreground">
        Preview ({questions.length} question
        {questions.length === 1 ? "" : "s"})
      </label>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/40 p-3">
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Parsed questions will appear here.
          </p>
        ) : (
          questions.map((question, index) => {
            /*
             * Multiple answer support:
             *
             * New data:
             * correctAnswers: ["Option A", "Option C"]
             *
             * Legacy data:
             * correctAnswer: "Option A"
             */
            const correctAnswers =
              question.correctAnswers?.length > 0
                ? question.correctAnswers
                : question.correctAnswer
                  ? [question.correctAnswer]
                  : [];

            const correctAnswerLetters = correctAnswers
              .map((answer) => {
                const optionIndex = question.options.indexOf(answer);

                return optionIndex >= 0
                  ? String.fromCharCode(65 + optionIndex)
                  : answer;
              })
              .join(", ");

            return (
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
                    {question.options.map((option, optionIndex) => {
                      const isCorrect = correctAnswers.includes(option);

                      return (
                        <li
                          key={optionIndex}
                          className={
                            isCorrect ? "font-semibold text-green-600" : ""
                          }
                        >
                          {String.fromCharCode(65 + optionIndex)}. {option}
                          {isCorrect && " (correct)"}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {question.type === "MCQ" && correctAnswers.length > 0 && (
                  <div className="mt-2 rounded-md border border-green-500/20 bg-green-500/5 px-2.5 py-1.5 text-xs text-green-600">
                    <span className="font-semibold">
                      Correct answer
                      {correctAnswers.length > 1 ? "s" : ""}:
                    </span>{" "}
                    {correctAnswerLetters}
                  </div>
                )}

                {question.cqParts && question.cqParts.length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                    {question.cqParts.map((part, partIndex) => (
                      <li key={partIndex} className="flex items-start gap-2">
                        <span className="font-semibold">
                          {getCqPartLabel(partIndex, locale)}.
                        </span>

                        <span className="flex-1">{part.text}</span>

                        <span>[{part.marks}]</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
