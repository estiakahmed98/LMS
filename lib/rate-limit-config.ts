/**
 * Central tuning table for every Live Classroom rate limit. Routes reference
 * `RATE_LIMITS.<name>` — never hardcode a number/window at the call site, so
 * the whole policy can be reviewed and adjusted from one file.
 */

export interface RateLimitWindowConfig {
  /** Max requests allowed within `window`. */
  limit: number;
  /** Upstash duration string, e.g. "60 s", "10 s", "5 m". */
  window: string;
}

export interface RateLimitConfig extends RateLimitWindowConfig {
  /** Optional second (typically shorter) window that must ALSO pass. */
  burst?: RateLimitWindowConfig;
}

export const RATE_LIMIT_ERROR_CODE = "RATE_LIMITED" as const;
export const RATE_LIMIT_MISCONFIGURED_CODE = "RATE_LIMIT_MISCONFIGURED" as const;

export const RATE_LIMITS = {
  /** Cross-session ceiling; prevents random session ids from minting unlimited keys. */
  liveApiGlobal: { limit: 180, window: "60 s" },
  /** GET room state / full snapshot poll. */
  roomState: { limit: 40, window: "60 s", burst: { limit: 5, window: "5 s" } },
  join: { limit: 5, window: "5 m" },
  leave: { limit: 5, window: "60 s" },
  livekitToken: { limit: 5, window: "60 s" },
  /** Chat must satisfy BOTH windows. */
  chat: { limit: 30, window: "60 s" },
  chatBurst: { limit: 5, window: "10 s" },
  messageRead: { limit: 60, window: "60 s" },
  hand: { limit: 6, window: "10 s" },
  /** Admit / reject / remove — keyed per host per session. */
  hostAction: { limit: 30, window: "60 s" },
  /** Recording start / stop / finalize. */
  recordingControl: { limit: 3, window: "60 s" },
  recordingChunk: { limit: 30, window: "60 s" },
  /** LiveKit webhook, keyed globally or by source IP. */
  webhook: { limit: 120, window: "60 s" },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitName = keyof typeof RATE_LIMITS;
