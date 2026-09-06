export type McqAnswerValue = string | string[];

export function normalizeMcqAnswers(value: McqAnswerValue | null | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((answer) => answer.trim()).filter(Boolean))].sort();
}

export function isExactMcqAnswer(
  selected: McqAnswerValue | null | undefined,
  correctAnswers: string[],
  legacyCorrectAnswer?: string | null,
) {
  const selectedValues = normalizeMcqAnswers(selected);
  const expectedValues = normalizeMcqAnswers(
    correctAnswers.length ? correctAnswers : legacyCorrectAnswer,
  );
  return selectedValues.length > 0 &&
    selectedValues.length === expectedValues.length &&
    selectedValues.every((answer, index) => answer === expectedValues[index]);
}
