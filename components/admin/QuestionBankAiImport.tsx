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

const SAMPLE_MCQ = `1. Who is the writer of the story 'Subha'? [5 marks]
A. Sarat Chandra Chattopadhyay B. Rabindranath Tagore
C. Bibhutibhushan Bandyopadhyay D. Manik Bandyopadhyay

2. What is emphasized in 'Boi Pora'? [5 marks]
A. Sports B. Reading Books
C. Business D. Traveling`;

const SAMPLE_CQ = `সৃজনশীল প্রশ্ন ১:
মেধাবী ছাত্র হাসান লেখাপড়া শেষ করে সরকারি উচ্চ পদে একটি চাকরি পায়। ইচ্ছে করলেই সে অনেক আর্থিক সম্পদের মালিক হতে পারে। কিন্তু সে এটা পছন্দ করে না।

ক. জ্ঞান পরিবেশন কীসের উপায়? [1 marks]
খ. 'প্রাণিত্বের বাধন' বলতে কী বোঝানো হয়েছে? ব্যাখ্যা করো। [2 marks]
গ. উদ্দীপকের সুজা চরিত্রে কোন ভাবটি ফুটে উঠেছে ব্যাখ্যা করো। [3 marks]
ঘ. উদ্দীপকে হাসানের কর্মকাণ্ড লেখকের প্রত্যাশার প্রতিফলন ঘটেছে বলে কি তুমি মনে করো? [4 marks]`;

export default function QuestionBankAiImport({
  disabled,
  defaultType,
  onImport,
}: {
  disabled?: boolean;
  defaultType: QuestionTypeValue;
  onImport: (questions: AdminExtractedQuestion[]) => Promise<void> | void;
}) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isCq = defaultType === "WRITTEN";

  const preview = text.trim()
    ? coerceQuestionsToType(parseQuestionsFromText(text), defaultType)
    : [];

  async function handleImport() {
    const parsed = coerceQuestionsToType(
      parseQuestionsFromText(text),
      defaultType,
    );
    if (parsed.length === 0) {
      setError(
        "No questions detected. Use numbered questions (1., 2., ...), A-D options, and [N marks].",
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
          title="Before you paste - format matters"
          format={isCq ? "CQ" : "MCQ"}
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
                  Paste question paper text
                </label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={isCq ? SAMPLE_CQ : SAMPLE_MCQ}
                  rows={14}
                  className="min-h-70 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {isCq ? (
                    <>
                      For CQ: write the উদ্দীপক (passage), then{" "}
                      <code>ক.</code> <code>খ.</code> <code>গ.</code>{" "}
                      <code>ঘ.</code> sub-questions each ending with{" "}
                      <code>[marks]</code>.
                    </>
                  ) : (
                    <>
                      Use <code>1.</code>, <code>2.</code>, ... for question
                      numbers, <code>A.</code> through <code>D.</code> for
                      options, and <code>[5 marks]</code> for marks. Matches
                      the standard model-test paper layout.
                    </>
                  )}
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
                  {question.type} | {question.marks}m
                </span>
              </div>
              {question.options.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {question.options.map((option, optionIndex) => (
                    <li key={optionIndex}>
                      {String.fromCharCode(65 + optionIndex)}. {option}
                    </li>
                  ))}
                </ul>
              )}
              {question.cqParts && question.cqParts.length > 0 && (
                <ol className="mt-1.5 space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {question.cqParts.map((part, partIndex) => (
                    <li key={partIndex}>
                      {part.label}. {part.text} [{part.marks} marks]
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
