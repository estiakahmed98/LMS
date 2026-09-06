import { describe, expect, it } from "vitest";
import { intervalsOverlap } from "./class-schedule";

const interval = (start: string, end: string) => ({
  scheduledStart: new Date(start),
  scheduledEnd: new Date(end),
});

describe("class schedule overlap", () => {
  const existing = interval("2026-09-10T10:00:00Z", "2026-09-10T11:00:00Z");

  it.each([
    ["2026-09-10T09:30:00Z", "2026-09-10T10:30:00Z"],
    ["2026-09-10T10:30:00Z", "2026-09-10T11:30:00Z"],
    ["2026-09-10T10:15:00Z", "2026-09-10T10:45:00Z"],
    ["2026-09-10T09:00:00Z", "2026-09-10T12:00:00Z"],
  ])("detects an overlapping interval from %s to %s", (start, end) => {
    expect(intervalsOverlap(existing, interval(start, end))).toBe(true);
  });

  it.each([
    ["2026-09-10T09:00:00Z", "2026-09-10T10:00:00Z"],
    ["2026-09-10T11:00:00Z", "2026-09-10T12:00:00Z"],
  ])("allows adjacent intervals from %s to %s", (start, end) => {
    expect(intervalsOverlap(existing, interval(start, end))).toBe(false);
  });
});
