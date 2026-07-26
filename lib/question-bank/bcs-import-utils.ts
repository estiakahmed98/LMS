import type {
  BcsAnswerLabel,
  BcsColumnMap,
  ImportedBcsQuestion,
  ImportRowStatus,
} from "@/lib/question-bank/bcs-import-types";

const labels: BcsAnswerLabel[] = ["A", "B", "C", "D"];

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function normalizeCellValue(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeQuestionForDuplicate(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function detectBcsColumnMap(headers: string[]): BcsColumnMap {
  const aliases: Record<keyof BcsColumnMap, string[]> = {
    questionNumber: ["questionno", "questionnumber", "sl", "serial", "serialno"],
    subject: ["subject", "subjectname"],
    question: ["question", "questiontext"],
    optionA: ["optiona", "a", "option1"],
    optionB: ["optionb", "b", "option2"],
    optionC: ["optionc", "c", "option3"],
    optionD: ["optiond", "d", "option4"],
    correctAnswer: ["correctanswer", "correct", "answer", "rightanswer"],
    explanation: ["explanation", "solution", "details"],
  };
  const normalized = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));
  const map: BcsColumnMap = {};
  for (const [field, fieldAliases] of Object.entries(aliases) as [
    keyof BcsColumnMap,
    string[],
  ][]) {
    const match = normalized.find((header) =>
      fieldAliases.includes(header.normalized),
    );
    if (match) map[field] = match.original;
  }
  return map;
}

function normalizeAnswerToken(value: unknown): string {
  return normalizeCellValue(value)
    .toUpperCase()
    .replace(/^ANSWER[:\s]*/i, "")
    .replace(/^OPTION\s*/i, "")
    .replace(/[().:]/g, "")
    .trim();
}

export function parseCorrectAnswer(
  value: unknown,
  options: Record<BcsAnswerLabel, string>,
): BcsAnswerLabel | null {
  const token = normalizeAnswerToken(value);
  const direct: Record<string, BcsAnswerLabel> = {
    A: "A",
    B: "B",
    C: "C",
    D: "D",
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
  };
  if (direct[token]) return direct[token];
  const normalizedText = normalizeQuestionForDuplicate(normalizeCellValue(value));
  return (
    labels.find(
      (label) => normalizeQuestionForDuplicate(options[label]) === normalizedText,
    ) ?? null
  );
}

export function parseQuestionNumber(
  value: unknown,
  fallback: number,
): number {
  const parsed = Number(String(value ?? "").replace(/[^\d]/g, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function validateBcsQuestion(
  question: ImportedBcsQuestion,
): ImportedBcsQuestion {
  const errors: string[] = [];
  const warnings: string[] = question.warnings.filter((warning) =>
    warning.toLowerCase().includes("duplicate"),
  );
  if (!question.questionText) errors.push("Question is missing");
  for (const label of labels) {
    if (!question.options[label]) errors.push(`Option ${label} is missing`);
  }
  if (!question.correctAnswer) {
    errors.push("Correct answer must be A, B, C, or D");
  }
  if (!question.subject) warnings.push("Subject is missing");
  if (!question.explanation) warnings.push("Explanation is missing");

  const optionValues = labels.map((label) =>
    normalizeQuestionForDuplicate(question.options[label]),
  );
  const filledOptions = optionValues.filter(Boolean);
  if (new Set(filledOptions).size < filledOptions.length) {
    warnings.push("Duplicate option text");
  }
  if (filledOptions.length === 4 && new Set(filledOptions).size === 1) {
    errors.push("All options are identical");
  }

  return {
    ...question,
    errors,
    warnings,
    isValid: errors.length === 0,
    selected: errors.length === 0 ? question.selected : false,
  };
}

export function getBcsQuestionStatus(
  question: ImportedBcsQuestion,
): ImportRowStatus {
  if (!question.isValid) return "invalid";
  if (
    question.warnings.some((warning) =>
      warning.toLowerCase().includes("duplicate"),
    )
  ) {
    return "duplicate";
  }
  if (question.warnings.length > 0) return "warning";
  return "valid";
}

export function revalidateBcsQuestions(
  questions: ImportedBcsQuestion[],
  existingQuestionTexts: string[],
): ImportedBcsQuestion[] {
  const seen = new Map<string, number>();
  const existing = new Set(existingQuestionTexts.map(normalizeQuestionForDuplicate));
  const firstPass = questions.map(validateBcsQuestion);
  return firstPass.map((question) => {
    const key = normalizeQuestionForDuplicate(question.questionText);
    const warnings = question.warnings.filter(
      (warning) =>
        warning !== "Possible duplicate question in this file" &&
        warning !== "Possible duplicate question already exists in this paper",
    );
    if (key) {
      const count = seen.get(key) ?? 0;
      if (count > 0) warnings.push("Possible duplicate question in this file");
      if (existing.has(key)) {
        warnings.push("Possible duplicate question already exists in this paper");
      }
      seen.set(key, count + 1);
    }
    return validateBcsQuestion({ ...question, warnings });
  });
}
