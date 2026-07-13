"use client";

import { useRef, useState } from "react";
import { LoaderCircle, ScanText, X } from "lucide-react";
import { extractTextFromFile } from "@/lib/assessment-file-text";
import {
  coerceQuestionsToType,
  parseQuestionsFromText,
} from "@/lib/assessment-question-parser";
import type {
  AdminExtractedQuestion,
  QuestionTypeValue,
} from "@/lib/admin-assessment-types";

export default function QuestionBankOcrImport({
  disabled,
  defaultType,
  onImport,
}: {
  disabled?: boolean;
  defaultType: QuestionTypeValue;
  onImport: (questions: AdminExtractedQuestion[]) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState("");
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const preview = rawText.trim()
    ? coerceQuestionsToType(parseQuestionsFromText(rawText), defaultType)
    : [];

  async function handleFile(file: File) {
    setError("");
    try {
      setScanning(true);
      setProgress("Preparing...");
      const text = await extractTextFromFile(file, setProgress);
      if (!text.trim()) {
        setError("No readable text found in that file.");
        return;
      }
      setRawText(text);
      setOpen(true);
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Failed to read the file.",
      );
    } finally {
      setScanning(false);
      setProgress("");
    }
  }

  async function handleImport() {
    const parsed = coerceQuestionsToType(
      parseQuestionsFromText(rawText),
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
      setRawText("");
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
        onClick={() => inputRef.current?.click()}
        disabled={disabled || scanning}
        className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        {scanning ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <ScanText className="h-4 w-4" />
        )}
        {scanning ? progress || "Scanning..." : "Upload & OCR"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      {!open && error && (
        <span className="text-sm text-destructive">{error}</span>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <ScanText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-card-foreground">
                  OCR result - review &amp; edit
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
                  Extracted text (editable)
                </label>
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  rows={14}
                  className="min-h-70 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Numbered questions (<code>1.</code>, <code>2.</code>, ...)
                  with <code>A.</code>-<code>D.</code> options and{" "}
                  <code>[5 marks]</code> are detected automatically.
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
                  <ScanText className="h-4 w-4" />
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
