"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WATCH_COMPLETION_PERCENT } from "@/lib/learner-course-progress";

const SYNC_INTERVAL_MS = 30_000;

/**
 * Drives module completion/unlocking, plus periodic position sync so playback
 * resumes from the server rather than the browser.
 *
 * Two completion paths, chosen by whether there is a video to measure:
 *
 *  - A module with a video (uploaded file OR YouTube — both of our players
 *    report real position and length): this hook tracks watchedPercent and
 *    the module completes once the server sees WATCH_COMPLETION_PERCENT
 *    reached. Position is pushed to the server every ~30s, and on
 *    pause/unmount/tab-close, so a crash, a closed tab, or a different
 *    device all resume from the same spot.
 *  - A module with nothing to play (reading/practice with no video): there is
 *    no percentage to measure, so completion falls back to a server-side
 *    timer — once the module has been open long enough, it completes.
 *
 * In both cases the server is the sole authority on whether the module may
 * complete; this hook only decides when to ask.
 */
export function useModuleUnlock({
  courseId,
  moduleId,
  hasMeasurableVideo,
  initialRemainingSeconds,
  unlockDelaySeconds,
  initialWatchedPercent,
  alreadyCompleted,
  enabled = true,
  onCompleted,
}: {
  courseId: string;
  moduleId: string;
  /** True when a player can measure this module's playback (file or YouTube). */
  hasMeasurableVideo: boolean;
  initialRemainingSeconds: number;
  unlockDelaySeconds: number;
  initialWatchedPercent?: number;
  alreadyCompleted: boolean;
  enabled?: boolean;
  onCompleted?: (result: {
    moduleCompleted: boolean;
    nextModuleId: string | null;
    requiresQuiz: boolean;
  }) => void;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(
    alreadyCompleted ? 0 : initialRemainingSeconds,
  );
  const [watchedPercent, setWatchedPercent] = useState(
    initialWatchedPercent ?? 0,
  );
  const [completed, setCompleted] = useState(alreadyCompleted);

  // Guards against double-firing across re-renders and StrictMode's double
  // effect invocation in development.
  const completingRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const endpoint = `/api/learner/courses/${courseId}/modules/${moduleId}/video-progress`;

  // Record the open immediately, before any waiting. Only meaningful for the
  // TIME path, but harmless to send either way.
  useEffect(() => {
    if (!enabled || alreadyCompleted) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "open" }),
        });

        const data = await response.json().catch(() => null);
        if (cancelled || !response.ok || !data) return;

        if (typeof data.remainingSeconds === "number") {
          setRemainingSeconds(data.remainingSeconds);
        }
        if (data.alreadyCompleted) {
          setCompleted(true);
        }
      } catch {
        // Offline: fall back to the countdown we were rendered with.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [endpoint, enabled, alreadyCompleted]);

  const complete = useCallback(async () => {
    if (completingRef.current || completed) return;
    completingRef.current = true;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "complete" }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // The server says it is not ready yet — adopt its numbers rather than
        // assuming completion.
        if (typeof data?.remainingSeconds === "number") {
          setRemainingSeconds(data.remainingSeconds);
        }
        completingRef.current = false;
        return;
      }

      setCompleted(true);
      setRemainingSeconds(0);

      onCompletedRef.current?.({
        moduleCompleted: Boolean(data?.moduleCompleted),
        nextModuleId: data?.nextModuleId ?? null,
        requiresQuiz: Boolean(data?.requiresQuiz),
      });
    } catch {
      completingRef.current = false;
    }
  }, [endpoint, completed]);

  // --- TIME path (modules with no video to measure) ----------------------

  useEffect(() => {
    if (hasMeasurableVideo || !enabled || completed || remainingSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [hasMeasurableVideo, enabled, completed, remainingSeconds]);

  useEffect(() => {
    if (hasMeasurableVideo || !enabled || completed || remainingSeconds > 0) {
      return;
    }

    void complete();
  }, [hasMeasurableVideo, enabled, completed, remainingSeconds, complete]);

  // --- WATCH path (modules with a measurable video) ----------------------
  //
  // The player calls reportProgress far more often than every 30s (it needs
  // to react quickly once 80% is crossed), but that must not translate into a
  // network request on every call. Local state (watchedPercent, and the
  // latest position in a ref) updates immediately; only the interval below,
  // plus pause/unmount/tab-close, actually reach the server.

  const latestPlaybackRef = useRef({
    positionSeconds: 0,
    durationSeconds: 0,
    watchedPercent: 0,
  });
  const lastSyncedAtRef = useRef(0);

  const syncPosition = useCallback(
    (payload: {
      positionSeconds: number;
      durationSeconds: number;
      watchedPercent: number;
    }) => {
      lastSyncedAtRef.current = Date.now();

      // navigator.sendBeacon fires reliably even as the tab is closing, which
      // a normal fetch is not guaranteed to do.
      const body = JSON.stringify({ intent: "sync", ...payload });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(endpoint, blob);
        return;
      }

      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // A missed sync only costs some resume precision; never block playback.
      });
    },
    [endpoint],
  );

  /** Force an immediate sync regardless of the 30s cadence — used on pause/unmount. */
  const flushSync = useCallback(() => {
    const snapshot = latestPlaybackRef.current;
    if (snapshot.durationSeconds > 0) {
      syncPosition(snapshot);
    }
  }, [syncPosition]);

  // Called on every player tick (may be every second or two). Updates local
  // state immediately so 80% is detected promptly, but only pushes to the
  // server on the ~30s cadence enforced below.
  const reportProgress = useCallback(
    (payload: {
      positionSeconds: number;
      durationSeconds: number;
      watchedPercent: number;
    }) => {
      if (!hasMeasurableVideo || !enabled) return;

      // Watermark: rewatching an earlier part must never lower the recorded
      // percentage or un-complete an already-watched module.
      const nextPercent = Math.max(
        latestPlaybackRef.current.watchedPercent,
        payload.watchedPercent,
      );

      latestPlaybackRef.current = {
        positionSeconds: payload.positionSeconds,
        durationSeconds: payload.durationSeconds,
        watchedPercent: nextPercent,
      };

      setWatchedPercent(nextPercent);

      if (Date.now() - lastSyncedAtRef.current >= SYNC_INTERVAL_MS) {
        syncPosition(latestPlaybackRef.current);
      }
    },
    [hasMeasurableVideo, enabled, syncPosition],
  );

  // Complete as soon as the watched threshold is crossed. Flush immediately
  // so the position backing this completion is not lost to the 30s cadence.
  useEffect(() => {
    if (!hasMeasurableVideo || !enabled || completed) return;
    if (watchedPercent < WATCH_COMPLETION_PERCENT) return;

    flushSync();
    void complete();
  }, [hasMeasurableVideo, enabled, completed, watchedPercent, complete, flushSync]);

  // Belt-and-braces periodic flush: guarantees a sync at least every 30s even
  // during a long stretch with no reportProgress calls (e.g. the player is
  // paused on-screen without emitting ticks).
  useEffect(() => {
    if (!hasMeasurableVideo || !enabled || completed) return;

    const interval = setInterval(flushSync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasMeasurableVideo, enabled, completed, flushSync]);

  // Flush on pause and on unmount (navigating away, closing the tab) so the
  // exact stopping point is never lost to the periodic cadence.
  useEffect(() => {
    if (!hasMeasurableVideo) return;

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flushSync();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", flushSync);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", flushSync);
      flushSync();
    };
  }, [hasMeasurableVideo, flushSync]);

  return {
    remainingSeconds,
    watchedPercent,
    completed,
    unlockDelaySeconds,
    reportProgress,
    /** 0-100, for a progress bar under the player. */
    progressPercent: hasMeasurableVideo
      ? Math.min(
          100,
          Math.round((watchedPercent / WATCH_COMPLETION_PERCENT) * 100),
        )
      : unlockDelaySeconds > 0
        ? Math.min(
            100,
            Math.round(
              ((unlockDelaySeconds - remainingSeconds) / unlockDelaySeconds) *
                100,
            ),
          )
        : 100,
  };
}
