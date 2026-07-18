import type { QuestionBankItemSummary } from "@/lib/question-bank-types";

// CQ (creative question) sub-parts are stored in the existing `options`
// string[] column as JSON-encoded { label, text, marks } entries, keeping
// question papers, and marks per part, without a schema migration.

export const CQ_PART_LABELS = ["ক", "খ", "গ", "ঘ"] as const;
export type CqPartLabel = (typeof CQ_PART_LABELS)[number];

export interface CqPart {
  label: CqPartLabel;
  text: string;
  marks: number;
}

const CQ_PART_PREFIX = "__CQ_PART__:";

export function isCqPartOption(option: string): boolean {
  return option.startsWith(CQ_PART_PREFIX);
}

export function encodeCqParts(parts: CqPart[]): string[] {
  return parts.map((part) => CQ_PART_PREFIX + JSON.stringify(part));
}

export function decodeCqParts(options: string[]): CqPart[] {
  const decoded = options
    .filter(isCqPartOption)
    .map((option) => {
      try {
        return JSON.parse(option.slice(CQ_PART_PREFIX.length)) as CqPart;
      } catch {
        return null;
      }
    })
    .filter((part): part is CqPart => Boolean(part));

  if (decoded.length > 0) return decoded;

  return CQ_PART_LABELS.map((label) => ({ label, text: "", marks: 0 }));
}

export function cqTotalMarks(parts: CqPart[]): number {
  return parts.reduce((sum, part) => sum + (part.marks || 0), 0);
}

export function isCqQuestion(question: Pick<QuestionBankItemSummary, "type">) {
  return question.type === "WRITTEN";
}
