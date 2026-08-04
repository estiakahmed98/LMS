"use client";

import { AlertTriangle, Send } from "lucide-react";

export default function IncompleteSubmissionDialog({
  unansweredNumbers,
  submitting,
  onCancel,
  onConfirm,
}: {
  unansweredNumbers: number[];
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = unansweredNumbers.length;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incomplete-submission-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-amber-300 bg-card shadow-2xl dark:border-amber-800">
        <div className="border-b border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div>
              <h2
                id="incomplete-submission-title"
                className="text-lg font-bold text-card-foreground"
              >
                Submit with unanswered questions?
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                You still have {count} unanswered {count === 1 ? "question" : "questions"}.
                You may submit now, but these will be recorded as unanswered.
              </p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Questions remaining ({count})
          </p>
          <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {unansweredNumbers.map((number) => (
              <span
                key={number}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
              >
                Q{number}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
            >
              Continue Answering
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Anyway"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
