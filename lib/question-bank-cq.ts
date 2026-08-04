import type { QuestionBankItemSummary } from "@/lib/question-bank-types";

// CQ (creative question) sub-parts are stored in the existing `options`
// string[] column as JSON-encoded { label, text, marks } entries, keeping
// question papers, and marks per part, without a schema migration.

export const CQ_PART_LABELS = ["ক", "খ", "গ", "ঘ"] as const;
const BENGALI_PART_LABELS = [
  "ক", "খ", "গ", "ঘ", "ঙ", "চ", "ছ", "জ", "ঝ", "ঞ",
  "ট", "ঠ", "ড", "ঢ", "ণ", "ত", "থ", "দ", "ধ", "ন",
  "প", "ফ", "ব", "ভ", "ম", "য", "র", "ল", "শ", "ষ", "স", "হ",
] as const;

export interface CqPart {
  // Retained in storage for backward compatibility. The UI derives the
  // visible label from the part index and active locale.
  label: string;
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
  return options
    .filter(isCqPartOption)
    .map((option) => {
      try {
        const parsed = JSON.parse(
          option.slice(CQ_PART_PREFIX.length),
        ) as Partial<CqPart>;
        if (!parsed || typeof parsed !== "object") return null;
        return {
          label: String(parsed.label ?? ""),
          text: String(parsed.text ?? ""),
          marks: Math.max(0, Number(parsed.marks) || 0),
        } satisfies CqPart;
      } catch {
        return null;
      }
    })
    .filter((part): part is CqPart => Boolean(part));
}

function englishPartLabel(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

export function getCqPartLabel(index: number, locale: string): string {
  if (locale === "bn") {
    return BENGALI_PART_LABELS[index] ?? String(index + 1);
  }
  return englishPartLabel(index);
}

export function createCqPart(index: number, locale: string): CqPart {
  return {
    label: getCqPartLabel(index, locale),
    text: "",
    marks: 0,
  };
}

export function cqTotalMarks(parts: CqPart[]): number {
  return parts.reduce((sum, part) => sum + (part.marks || 0), 0);
}

export function isCqQuestion(question: Pick<QuestionBankItemSummary, "type">) {
  return question.type === "WRITTEN";
}
