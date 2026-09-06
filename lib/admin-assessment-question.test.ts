import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/audit", () => ({ auditLogEntry: vi.fn() }));

import { normalizeQuestionPayload } from "./admin-assessment-server";

const mcq = {
  type: "MCQ", question: "  Which   values apply?  ", marks: 5,
  options: ["A", "B", "C"], rubric: null, difficulty: "MEDIUM",
  timeLimitMinutes: 2,
};

describe("assessment MCQ validation", () => {
  it("rejects an MCQ without a selected correct answer", () => {
    expect(() => normalizeQuestionPayload({ ...mcq, correctAnswer: null })).toThrow(
      "Select at least one correct answer",
    );
  });
  it("accepts and normalizes multiple correct answers", () => {
    expect(normalizeQuestionPayload({ ...mcq, correctAnswers: ["C", "A", "A"] })).toMatchObject({
      question: "Which values apply?", correctAnswer: "C", correctAnswers: ["C", "A"],
    });
  });
  it("rejects answers outside the options and duplicate options", () => {
    expect(() => normalizeQuestionPayload({ ...mcq, correctAnswers: ["D"] })).toThrow();
    expect(() => normalizeQuestionPayload({ ...mcq, options: ["A", "a"], correctAnswers: ["A"] })).toThrow(
      "options must be unique",
    );
  });
});
