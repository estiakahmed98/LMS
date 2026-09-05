import { describe, expect, it } from "vitest";
import { selectEffectiveAssessmentAssignment } from "./assessment-access-policy";

describe("selectEffectiveAssessmentAssignment", () => {
  it("prefers an individual override over batch and course targets", () => {
    const updatedAt = new Date("2026-08-04T00:00:00Z");
    const selected = selectEffectiveAssessmentAssignment([
      { id: "course", targetType: "COURSE" as const, updatedAt },
      { id: "batch", targetType: "BATCH" as const, updatedAt },
      { id: "learner", targetType: "LEARNER" as const, updatedAt },
    ]);

    expect(selected?.id).toBe("learner");
  });

  it("uses the most recently updated assignment at the same target level", () => {
    const selected = selectEffectiveAssessmentAssignment([
      {
        id: "older",
        targetType: "BATCH" as const,
        updatedAt: new Date("2026-08-03T00:00:00Z"),
      },
      {
        id: "newer",
        targetType: "BATCH" as const,
        updatedAt: new Date("2026-08-04T00:00:00Z"),
      },
    ]);

    expect(selected?.id).toBe("newer");
  });

  it("uses a stable id tie-breaker when assignment updates match", () => {
    const updatedAt = new Date("2026-08-04T00:00:00Z");
    expect(selectEffectiveAssessmentAssignment([
      { id: "a", targetType: "BATCH" as const, updatedAt },
      { id: "z", targetType: "BATCH" as const, updatedAt },
    ])?.id).toBe("z");
  });

  it("returns null when no assignment matches", () => {
    expect(selectEffectiveAssessmentAssignment([])).toBeNull();
  });
});
