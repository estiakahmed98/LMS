import { describe, expect, it } from "vitest";
import { cohortCodeFromName, normalizeCohortCode } from "./cohort-code";

describe("cohort codes", () => {
  it("normalizes a human label into a stable uppercase code", () => {
    expect(normalizeCohortCode("  PSTC 2026 / Batch 01  ")).toBe(
      "PSTC-2026-BATCH-01",
    );
  });

  it("removes unsupported characters and caps storage length", () => {
    const code = normalizeCohortCode("Batch_#_with a very long operational label 2026");
    expect(code).toMatch(/^[A-Z0-9-]+$/);
    expect(code.length).toBeLessThanOrEqual(32);
  });

  it("builds a year-qualified code from a name", () => {
    expect(cohortCodeFromName("Nursing Intake", 2027)).toBe(
      "NURSING-INTAKE-2027",
    );
  });
});
