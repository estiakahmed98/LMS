import { afterEach, describe, expect, it, vi } from "vitest";
import { cohortEndDateMin, cohortToday, validateNewCohortDates } from "./cohort-dates";

describe("new cohort dates", () => {
  afterEach(() => vi.useRealTimers());
  it("uses the cohort timezone at midnight", () => {
    expect(cohortToday("Asia/Dhaka", new Date("2026-09-05T18:30:00Z"))).toBe("2026-09-06");
  });
  it("rejects past dates, impossible dates, and invalid ranges", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T08:00:00Z"));
    for (const [start, end] of [
      ["2026-09-05", null], [null, "2026-09-05"],
      ["2027-02-30", null], ["invalid", null],
      ["2026-09-07", "2026-09-07"], ["2026-09-08", "2026-09-07"],
    ]) expect(() => validateNewCohortDates(start, end)).toThrow();
    expect(() => validateNewCohortDates("2026-09-06", "2026-09-07")).not.toThrow();
    expect(() => validateNewCohortDates(null, null)).not.toThrow();
  });
  it("limits end dates to after the start date and handles month boundaries", () => {
    expect(cohortEndDateMin("2026-09-30", "2026-09-06")).toBe("2026-10-01");
    expect(cohortEndDateMin(null, "2026-09-06")).toBe("2026-09-06");
  });
});
