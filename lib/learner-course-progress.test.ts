import { describe, expect, it } from "vitest";
import {
  calculateCourseProgress,
  effectiveDurationMinutes,
  getLinearModuleStatuses,
  hasUnlockDelayElapsed,
  hasWatchedEnough,
  isModuleComplete,
  remainingUnlockSeconds,
  UNLOCK_DELAY_SECONDS,
  WATCH_COMPLETION_PERCENT,
} from "./learner-course-progress";

const plain = (completed: boolean) => ({
  completed,
  hasQuiz: false,
  quizPassed: false,
});

describe("course progress", () => {
  it("returns 20% when 2 of 10 modules are completed", () => {
    expect(
      calculateCourseProgress(
        Array.from({ length: 10 }, (_, index) => plain(index < 2)),
      ),
    ).toEqual({ completedCount: 2, progress: 20 });
  });

  it("reports no progress for a course with no modules", () => {
    expect(calculateCourseProgress([])).toEqual({
      completedCount: 0,
      progress: 0,
    });
  });

  it("does not count a quiz module until its quiz is passed", () => {
    const states = [
      { completed: true, hasQuiz: true, quizPassed: false },
      { completed: true, hasQuiz: true, quizPassed: true },
    ];

    expect(calculateCourseProgress(states)).toEqual({
      completedCount: 1,
      progress: 50,
    });
  });
});

describe("linear unlocking", () => {
  it("locks everything after the first incomplete module", () => {
    expect(
      getLinearModuleStatuses([plain(true), plain(false), plain(true)]),
    ).toEqual(["completed", "current", "locked"]);
  });

  it("keeps a watched-but-unpassed quiz module current, locking the next", () => {
    expect(
      getLinearModuleStatuses([
        { completed: true, hasQuiz: true, quizPassed: false },
        plain(false),
      ]),
    ).toEqual(["current", "locked"]);
  });

  it("makes the first module available in a fresh course", () => {
    expect(getLinearModuleStatuses([plain(false), plain(false)])).toEqual([
      "current",
      "locked",
    ]);
  });
});

describe("isModuleComplete", () => {
  it("requires the quiz only when the module has one", () => {
    expect(isModuleComplete({ completed: true, hasQuiz: false, quizPassed: false })).toBe(true);
    expect(isModuleComplete({ completed: true, hasQuiz: true, quizPassed: false })).toBe(false);
    expect(isModuleComplete({ completed: false, hasQuiz: false, quizPassed: false })).toBe(false);
  });
});

describe("unlock timer", () => {
  const opened = new Date("2026-07-27T10:00:00Z");

  it("requires the full delay when the module was never opened", () => {
    expect(remainingUnlockSeconds(null)).toBe(UNLOCK_DELAY_SECONDS);
    expect(hasUnlockDelayElapsed(null)).toBe(false);
  });

  it("counts down while the learner waits", () => {
    const now = new Date(opened.getTime() + 20_000);
    expect(remainingUnlockSeconds(opened, now)).toBe(UNLOCK_DELAY_SECONDS - 20);
    expect(hasUnlockDelayElapsed(opened, now)).toBe(false);
  });

  it("unlocks once the delay has elapsed", () => {
    const now = new Date(opened.getTime() + UNLOCK_DELAY_SECONDS * 1000);
    expect(remainingUnlockSeconds(opened, now)).toBe(0);
    expect(hasUnlockDelayElapsed(opened, now)).toBe(true);
  });

  it("still unlocks when the learner returns long afterwards", () => {
    // Time spent is never lost: a crash mid-timer must not cost the learner
    // the wait they already served.
    const now = new Date(opened.getTime() + 2 * 24 * 60 * 60 * 1000);
    expect(hasUnlockDelayElapsed(opened, now)).toBe(true);
  });

  it("does not hand out a free unlock when the clock skews backwards", () => {
    const now = new Date(opened.getTime() - 60_000);
    expect(remainingUnlockSeconds(opened, now)).toBe(UNLOCK_DELAY_SECONDS);
  });

  it("accepts an ISO string as well as a Date", () => {
    const now = new Date(opened.getTime() + UNLOCK_DELAY_SECONDS * 1000);
    expect(hasUnlockDelayElapsed(opened.toISOString(), now)).toBe(true);
  });
});

describe("hasWatchedEnough", () => {
  it("requires at least the completion threshold", () => {
    expect(hasWatchedEnough(WATCH_COMPLETION_PERCENT)).toBe(true);
    expect(hasWatchedEnough(WATCH_COMPLETION_PERCENT - 1)).toBe(false);
    expect(hasWatchedEnough(100)).toBe(true);
  });

  it("treats missing or invalid percentages as unwatched", () => {
    expect(hasWatchedEnough(null)).toBe(false);
    expect(hasWatchedEnough(undefined)).toBe(false);
    expect(hasWatchedEnough(Number.NaN)).toBe(false);
  });
});

describe("effectiveDurationMinutes", () => {
  it("rounds a measured length up to whole minutes", () => {
    expect(effectiveDurationMinutes(61)).toBe(2);
    expect(effectiveDurationMinutes(600)).toBe(10);
  });

  it("never reports a real video as zero minutes", () => {
    expect(effectiveDurationMinutes(4)).toBe(1);
  });

  it("returns null when no length was measured", () => {
    expect(effectiveDurationMinutes(null)).toBeNull();
    expect(effectiveDurationMinutes(undefined)).toBeNull();
    expect(effectiveDurationMinutes(0)).toBeNull();
  });
});
