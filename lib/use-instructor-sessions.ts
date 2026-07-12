"use client";

import { useCallback, useEffect, useState } from "react";
import { parseApiJson } from "@/lib/parse-api-json";
import type { InstructorSession } from "@/lib/instructor-types";

export function useInstructorSessions() {
  const [sessions, setSessions] = useState<InstructorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/sessions");
      const data = await parseApiJson<{ sessions?: InstructorSession[]; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load sessions");
      }
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function postSessionAction(sessionId: string, action: "start" | "cancel" | "end") {
    const res = await fetch(`/api/instructor/sessions/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await parseApiJson<{ session?: InstructorSession; error?: string }>(res);
    if (!res.ok) {
      throw new Error(data.error ?? `Failed to ${action} session`);
    }
    await reload();
    return data.session as InstructorSession;
  }

  async function startSession(sessionId: string) {
    return postSessionAction(sessionId, "start");
  }

  async function cancelSession(sessionId: string) {
    return postSessionAction(sessionId, "cancel");
  }

  async function rescheduleSession(
    sessionId: string,
    scheduledStart: string,
    scheduledEnd: string,
  ) {
    const res = await fetch(`/api/instructor/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledStart, scheduledEnd }),
    });
    const data = await parseApiJson<{ session?: InstructorSession; error?: string }>(res);
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to reschedule session");
    }
    await reload();
    return data.session as InstructorSession;
  }

  return { sessions, loading, error, reload, startSession, cancelSession, rescheduleSession };
}
