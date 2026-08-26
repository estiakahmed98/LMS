import { describe, expect, it } from "vitest";
import { assertValidTransition, type LiveRecordingState } from "./live-recording-state-machine";

const ALL_STATES: LiveRecordingState[] = ["IDLE", "STARTING", "ACTIVE", "ENDING", "COMPLETE", "FAILED"];

const VALID_PAIRS: [LiveRecordingState, LiveRecordingState][] = [
  ["IDLE", "STARTING"],
  ["STARTING", "ACTIVE"],
  ["STARTING", "FAILED"],
  ["STARTING", "ENDING"],
  ["ACTIVE", "ENDING"],
  ["ACTIVE", "FAILED"],
  ["ENDING", "COMPLETE"],
  ["ENDING", "FAILED"],
  ["FAILED", "STARTING"],
];

describe("assertValidTransition", () => {
  it.each(VALID_PAIRS)("allows %s -> %s", (current, next) => {
    expect(() => assertValidTransition(current, next)).not.toThrow();
  });

  it("allows every same-state transition as a no-op", () => {
    for (const state of ALL_STATES) {
      expect(() => assertValidTransition(state, state)).not.toThrow();
    }
  });

  it("rejects every pair not explicitly listed as valid or a same-state no-op", () => {
    const validSet = new Set(VALID_PAIRS.map(([a, b]) => `${a}->${b}`));
    for (const current of ALL_STATES) {
      for (const next of ALL_STATES) {
        if (current === next) continue;
        const key = `${current}->${next}`;
        if (validSet.has(key)) continue;
        expect(() => assertValidTransition(current, next), key).toThrow();
      }
    }
  });

  it("rejects skipping ACTIVE by going straight IDLE -> ACTIVE", () => {
    expect(() => assertValidTransition("IDLE", "ACTIVE")).toThrow();
  });

  it("rejects reverse transitions like COMPLETE -> ACTIVE", () => {
    expect(() => assertValidTransition("COMPLETE", "ACTIVE")).toThrow();
  });

  it("COMPLETE is terminal — nothing is a valid transition out of it", () => {
    for (const next of ALL_STATES) {
      if (next === "COMPLETE") continue;
      expect(() => assertValidTransition("COMPLETE", next)).toThrow();
    }
  });

  it("thrown errors carry a 409 status", () => {
    try {
      assertValidTransition("IDLE", "ACTIVE");
      throw new Error("expected assertValidTransition to throw");
    } catch (error) {
      expect((error as { status?: number }).status).toBe(409);
    }
  });
});
