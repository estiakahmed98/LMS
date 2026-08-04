"use client";

import { useLocale } from "next-intl";
import { decodeCqParts, getCqPartLabel } from "@/lib/question-bank-cq";
import { cn } from "@/lib/utils";

export default function WrittenQuestionContent({
  prompt,
  options = [],
  className,
}: {
  prompt: string;
  options?: string[];
  className?: string;
}) {
  const locale = useLocale();
  const parts = decodeCqParts(options)
    .map((part, index) => ({ part, index }))
    .filter(({ part }) => part.text.trim().length > 0);

  return (
    <div className={cn("space-y-3 text-sm leading-6", className)}>
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {prompt}
      </p>
      {parts.length > 0 && (
        <ol className="space-y-2 border-t border-border pt-3">
          {parts.map(({ part, index }) => (
            <li key={index} className="flex min-w-0 items-start gap-2">
              <span className="shrink-0 font-semibold">
                {getCqPartLabel(index, locale)})
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {part.text}
              </span>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                [{part.marks}]
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
