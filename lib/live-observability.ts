/**
 * Lightweight structured logging for the Live Classroom module. Emits a
 * single-line JSON object per event so any downstream log pipeline
 * (CloudWatch, Loki, Datadog log ingestion, plain `grep`) can pick it up
 * without a vendor SDK.
 *
 * Deliberately never accepts auth tokens, API secrets, chat message content,
 * or raw recording bytes — the type below has no field for them, so a
 * caller cannot accidentally pass free-text content through.
 */

export interface LiveLogEvent {
  requestId: string;
  route: string;
  action?: string;
  userId?: string | null;
  sessionId?: string | null;
  status: number;
  latencyMs?: number;
  rateLimitResult?: "allowed" | "limited" | "misconfigured";
  recordingAttemptId?: string | null;
  seq?: number;
  liveKitCleanupFailed?: boolean;
  /** Short, non-sensitive note — never chat content, tokens, or secrets. */
  message?: string;
}

export function logLiveEvent(event: LiveLogEvent): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      channel: "live-classroom",
      ...event,
    }),
  );
}

export interface LiveLogMetric {
  name: string;
  value: number;
  tags?: Record<string, string>;
}

/**
 * Counter/histogram-style metric emission, same single-line JSON approach.
 * Aggregate these downstream (e.g. Loki/CloudWatch metric filters) rather
 * than wiring a dedicated metrics SDK into this codebase.
 */
export function logLiveMetric(name: string, value: number, tags?: Record<string, string>): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      channel: "live-classroom-metric",
      name,
      value,
      tags: tags ?? {},
    } satisfies { ts: string; channel: string } & LiveLogMetric),
  );
}
