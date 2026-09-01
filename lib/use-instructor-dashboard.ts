"use client";

import { useCallback, useEffect, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";
import type { InstructorDashboardPayload } from "@/lib/instructor-types";

const EMPTY_DASHBOARD: InstructorDashboardPayload = {
  stats: { todayCount: 0, upcomingCount: 0, completedCount: 0, liveCount: 0 },
  liveSessions: [],
  startingSoonSessions: [],
  todaySessions: [],
  upcomingSessions: [],
  recentCompletedSessions: [],
};

export function useInstructorDashboard(enabled = true) {
  const [data, setData] = useState<InstructorDashboardPayload>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setData(EMPTY_DASHBOARD);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/dashboard", { cache: "no-store" });
      const json = await parseApiJson<InstructorDashboardPayload & { error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load dashboard");
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setData(EMPTY_DASHBOARD);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const postSessionAction = useCallback(
    async (sessionId: string, action: "start" | "end") => {
      const res = await fetch(`/api/instructor/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(json.error ?? `Failed to ${action} session`);
      }
      await reload();
    },
    [reload],
  );

  const startSession = useCallback(
    (sessionId: string) => postSessionAction(sessionId, "start"),
    [postSessionAction],
  );
  const endSession = useCallback(
    (sessionId: string) => postSessionAction(sessionId, "end"),
    [postSessionAction],
  );

  return { ...data, loading, error, reload, startSession, endSession };
}
