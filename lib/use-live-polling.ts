"use client";

import { useEffect, useRef } from "react";
import { PollingController } from "@/lib/live-polling-controller";

export interface UseLivePollingOptions {
  enabled: boolean;
  fetchFn: (signal: AbortSignal) => Promise<Response>;
  onResult: (response: Response) => void;
  onError: (error: unknown) => void;
  baseIntervalMs: number;
  hiddenIntervalMs: number;
}

/**
 * React wrapper around PollingController: wires document visibility and
 * window online/offline events, and guarantees the controller is stopped
 * (in-flight request aborted, timers cleared) on unmount or when `enabled`
 * flips false.
 */
export function useLivePolling(options: UseLivePollingOptions): void {
  const { enabled, fetchFn, onResult, onError, baseIntervalMs, hiddenIntervalMs } = options;

  // Keep the latest callbacks in refs so the controller (created once per
  // enabled-session) always calls the current closure without needing to be
  // torn down and rebuilt every render.
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const controller = new PollingController({
      fetchFn: (signal) => fetchFnRef.current(signal),
      onResult: (response) => onResultRef.current(response),
      onError: (error) => onErrorRef.current(error),
      baseIntervalMs,
      hiddenIntervalMs,
    });

    const handleVisibility = () => {
      controller.notifyVisibility(document.visibilityState === "visible");
    };
    const handleOnline = () => controller.notifyOnline(true);
    const handleOffline = () => controller.notifyOnline(false);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    controller.notifyVisibility(document.visibilityState === "visible");
    controller.notifyOnline(navigator.onLine);
    controller.start();

    return () => {
      controller.stop();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [enabled, baseIntervalMs, hiddenIntervalMs]);
}
