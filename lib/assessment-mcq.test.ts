import { describe, expect, it } from "vitest";
import { isExactMcqAnswer, normalizeMcqAnswers } from "./assessment-mcq";

describe("multiple-answer MCQ scoring", () => {
  it("accepts the exact answer set regardless of selection order", () => {
    expect(isExactMcqAnswer(["C", "A"], ["A", "C"])).toBe(true);
  });
  it("rejects missing and additional selections", () => {
    expect(isExactMcqAnswer(["A"], ["A", "C"])).toBe(false);
    expect(isExactMcqAnswer(["A", "B", "C"], ["A", "C"])).toBe(false);
  });
  it("supports legacy single-answer submissions and removes duplicates", () => {
    expect(isExactMcqAnswer("A", [], "A")).toBe(true);
    expect(normalizeMcqAnswers([" A ", "A", "C"])).toEqual(["A", "C"]);
  });
});
