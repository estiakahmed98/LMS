/**
 * Module completion and sequential unlocking.
 *
 * Two different signals can complete a module's video, depending on the
 * source:
 *
 *  - Uploaded files (self-hosted MP4/S3/etc.): the player genuinely knows
 *    playback position, so completion is WATCH-BASED — reaching
 *    WATCH_COMPLETION_PERCENT of the real length unlocks the next module.
 *  - Embedded links (YouTube, Facebook, Vimeo, ...): our player cannot
 *    reliably report position or length for these, so "watched 80%" is not a
 *    signal we can measure. Completion falls back to TIME-BASED: once
 *    UNLOCK_DELAY_SECONDS have elapsed on the SERVER clock since the learner
 *    first opened the module, it completes.
 *
 * Two properties both paths must guarantee:
 *
 *  - Unlocking is permanent. It lives in the database per learner, so closing
 *    the browser, losing the network, or switching devices can never re-lock a
 *    module that was already unlocked.
 *  - Progress already made is never lost. Watch position/percent (for
 *    uploads) and the open timestamp (for the timer path) are written to the
 *    server as they happen, so a learner who is interrupted returns to
 *    exactly where they left off rather than starting over.
 *
 * Note the timer path paces a learner rather than evidencing learning —
 * elapsed time cannot tell watching apart from walking away. Where real
 * evidence matters, the module quiz carries it, which is why a module with a
 * quiz stays incomplete until that quiz is passed, regardless of which path
 * completed its video.
 */

export type LinearModuleStatus = "completed" | "current" | "locked";

/** How long a module must stay open before it completes and unlocks the next. */
export const UNLOCK_DELAY_SECONDS = 60;

/** Watched fraction (of the real, measured length) that completes an uploaded video. */
export const WATCH_COMPLETION_PERCENT = 80;

type CompletionState = {
  completed: boolean;
  hasQuiz: boolean;
  quizPassed: boolean;
};

export function isModuleComplete(state: CompletionState) {
  return state.completed && (!state.hasQuiz || state.quizPassed);
}

/** True once a measured watch percentage clears the completion threshold. */
export function hasWatchedEnough(
  watchedPercent: number | null | undefined,
): boolean {
  const percent = Number(watchedPercent ?? 0);
  return Number.isFinite(percent) && percent >= WATCH_COMPLETION_PERCENT;
}

/**
 * Seconds still to wait before a module may be completed, given when it was
 * first opened. Returns 0 once the delay has elapsed, and the full delay when
 * the module has never been opened.
 *
 * `now` is injectable so this stays deterministic under test.
 */
export function remainingUnlockSeconds(
  openedAt: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (!openedAt) return UNLOCK_DELAY_SECONDS;

  const opened = openedAt instanceof Date ? openedAt : new Date(openedAt);
  if (Number.isNaN(opened.getTime())) return UNLOCK_DELAY_SECONDS;

  const elapsedSeconds = (now.getTime() - opened.getTime()) / 1000;

  // Clock skew that puts the open time in the future must not hand out a free
  // unlock, so clamp elapsed time at zero.
  const remaining = UNLOCK_DELAY_SECONDS - Math.max(0, elapsedSeconds);

  return remaining > 0 ? Math.ceil(remaining) : 0;
}

/** True once a module has been open long enough to complete. */
export function hasUnlockDelayElapsed(
  openedAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  return remainingUnlockSeconds(openedAt, now) === 0;
}

/**
 * Strictly linear course state: once the first incomplete module is found,
 * every later module stays locked even if stale or out-of-order progress rows
 * exist for it.
 */
export function getLinearModuleStatuses(states: CompletionState[]) {
  let chainComplete = true;
  return states.map((state): LinearModuleStatus => {
    if (!chainComplete) return "locked";
    if (isModuleComplete(state)) return "completed";
    chainComplete = false;
    return "current";
  });
}

export function calculateCourseProgress(states: CompletionState[]) {
  const completedCount = states.filter(isModuleComplete).length;
  return {
    completedCount,
    progress:
      states.length > 0
        ? Math.round((completedCount / states.length) * 100)
        : 0,
  };
}

/**
 * Length to display for a module, in minutes, or null when unknown.
 *
 * Only uploaded video files report a real length. External embeds do not, and
 * an admin-typed guess next to a clock icon is worse than showing nothing — so
 * link-based modules render no duration at all.
 */
export function effectiveDurationMinutes(
  measuredSeconds?: number | null,
): number | null {
  if (!measuredSeconds || measuredSeconds <= 0) return null;

  return Math.max(1, Math.ceil(measuredSeconds / 60));
}
