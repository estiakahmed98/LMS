import { LiveRoomError } from "@/lib/live-room-error";

/**
 * Mirrors the Prisma `LiveRecordingState` enum. Kept as its own string union
 * here (rather than importing the generated enum) so this module stays
 * dependency-free and trivially unit-testable.
 */
export type LiveRecordingState = "IDLE" | "STARTING" | "ACTIVE" | "ENDING" | "COMPLETE" | "FAILED";

const ALLOWED_TRANSITIONS: Record<LiveRecordingState, ReadonlySet<LiveRecordingState>> = {
  IDLE: new Set(["STARTING"]),
  STARTING: new Set(["ACTIVE", "FAILED", "ENDING"]),
  ACTIVE: new Set(["ENDING", "FAILED"]),
  ENDING: new Set(["COMPLETE", "FAILED"]),
  COMPLETE: new Set([]),
  FAILED: new Set(["STARTING"]),
};

/**
 * Throws a 409 LiveRoomError when `next` is not a legal transition from
 * `current`. IDLE -> STARTING -> ACTIVE -> ENDING -> COMPLETE | FAILED, with
 * FAILED reachable as an escape hatch from any in-progress state, and a new
 * STARTING allowed from FAILED (retry) or IDLE (fresh start). No other
 * reverse/skip transitions are permitted.
 */
export function assertValidTransition(current: LiveRecordingState, next: LiveRecordingState): void {
  if (current === next) return; // idempotent no-op, handled by callers as a short-circuit
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.has(next)) {
    throw new LiveRoomError(
      `Cannot transition recording state from ${current} to ${next}.`,
      409,
    );
  }
}
