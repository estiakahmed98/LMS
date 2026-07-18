"use client";

import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function FormatDisclaimer({
  icon,
  title,
  format = "MCQ",
  onAccept,
  onCancel,
}: {
  icon: ReactNode;
  title: string;
  format?: "MCQ" | "CQ";
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-bold text-card-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border p-2 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5 text-sm">
          <p>This importer only reliably reads a specific layout:</p>
          {format === "CQ" ? (
            <>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
{`সৃজনশীল প্রশ্ন ১ : উদ্দীপক (passage) text here...

ক. Sub-question text [1 marks]
খ. Sub-question text [2 marks]
গ. Sub-question text [3 marks]
ঘ. Sub-question text [4 marks]`}
              </pre>
              <p>
                A heading like <code>সৃজনশীল প্রশ্ন ১:</code> (optional),
                then the উদ্দীপক (passage), then four sub-questions labeled{" "}
                <code>ক.</code> <code>খ.</code> <code>গ.</code>{" "}
                <code>ঘ.</code>, each ending with marks written as{" "}
                <code>[N marks]</code>.
              </p>
            </>
          ) : (
            <>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
{`1. Question text here [5 marks]
A. Option one    B. Option two
C. Option three  D. Option four`}
              </pre>
              <p>
                Numbered questions (<code>1.</code>, <code>2.</code>, ...),
                options labeled <code>A.</code> through <code>D.</code>, and
                marks written as <code>[5 marks]</code>.
              </p>
            </>
          )}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              If your file or pasted text uses a different format, questions
              may be misread, split incorrectly, or missed entirely. Review
              every extracted question before saving. This is a best-effort
              local parser, not a guarantee — the developer is not
              responsible for incorrect results from an unsupported format.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}
