import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isIP } from "node:net";
import {
  RATE_LIMIT_ERROR_CODE,
  RATE_LIMIT_MISCONFIGURED_CODE,
  type RateLimitConfig,
} from "@/lib/rate-limit-config";

export class RateLimitConfigError extends Error {
  readonly code = RATE_LIMIT_MISCONFIGURED_CODE;

  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigError";
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  /** Stable error code to surface to the client when `allowed` is false. */
  code: typeof RATE_LIMIT_ERROR_CODE;
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getRedisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

let cachedRedis: Redis | null | undefined;

/** Lazily constructs (and caches) the Redis client. Returns null if unconfigured. */
function getRedisClient(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const env = getRedisEnv();
  cachedRedis = env ? new Redis(env) : null;
  return cachedRedis;
}

/**
 * Every distinct (name, window) pair gets its own Ratelimit instance —
 * Upstash's Ratelimit objects are cheap and stateless beyond the Redis
 * client, so instance-per-limiter keeps window/limit config out of the key.
 */
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(name: string, cfg: { limit: number; window: string }): Ratelimit {
  const cacheKey = `${name}:${cfg.limit}:${cfg.window}`;
  const existing = limiterCache.get(cacheKey);
  if (existing) return existing;

  const redis = getRedisClient();
  if (!redis) {
    throw new RateLimitConfigError(
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured.",
    );
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window as Duration),
    prefix: `live-rl:${name}`,
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

// ---------------------------------------------------------------------------
// Development/test-only bounded in-memory fallback. NEVER used when
// NODE_ENV === "production" — see checkRateLimit below.
// ---------------------------------------------------------------------------

interface MemoryBucket {
  hits: number[]; // timestamps (ms) within the current window
}

const MEMORY_MAX_KEYS = 5000;
const memoryStore = new Map<string, MemoryBucket>();

function parseWindowMs(window: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(window.trim());
  if (!match) throw new Error(`Invalid rate-limit window: "${window}"`);
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * unitMs;
}

function sweepMemoryStoreIfNeeded() {
  if (memoryStore.size <= MEMORY_MAX_KEYS) return;
  // Bounded growth: evict the oldest-inserted entries (Map preserves insertion order).
  const excess = memoryStore.size - MEMORY_MAX_KEYS;
  const keys = memoryStore.keys();
  for (let i = 0; i < excess; i++) {
    const next = keys.next();
    if (next.done) break;
    memoryStore.delete(next.value);
  }
}

function checkMemoryLimit(key: string, cfg: { limit: number; window: string }): RateLimitResult {
  const windowMs = parseWindowMs(cfg.window);
  const now = Date.now();
  const bucket = memoryStore.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((ts) => now - ts < windowMs);

  if (bucket.hits.length >= cfg.limit) {
    const oldest = bucket.hits[0]!;
    const resetAt = oldest + windowMs;
    memoryStore.set(key, bucket);
    sweepMemoryStoreIfNeeded();
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      code: RATE_LIMIT_ERROR_CODE,
    };
  }

  bucket.hits.push(now);
  memoryStore.set(key, bucket);
  sweepMemoryStoreIfNeeded();
  return {
    allowed: true,
    remaining: cfg.limit - bucket.hits.length,
    resetAt: now + windowMs,
    retryAfterSeconds: 0,
    code: RATE_LIMIT_ERROR_CODE,
  };
}

async function checkOneWindow(
  name: string,
  key: string,
  cfg: { limit: number; window: string },
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    if (isProduction()) {
      throw new RateLimitConfigError(
        "Distributed rate limiting is required in production but UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN are not set.",
      );
    }
    return checkMemoryLimit(`${name}:${key}`, cfg);
  }

  const limiter = getUpstashLimiter(name, cfg);
  const result = await limiter.limit(key);
  const retryAfterSeconds = result.success
    ? 0
    : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
    retryAfterSeconds,
    code: RATE_LIMIT_ERROR_CODE,
  };
}

/**
 * Checks `key` against the named rate-limit config, including its optional
 * burst (short-window) sub-limit when present. Both windows must pass.
 *
 * Throws `RateLimitConfigError` in production when Redis isn't configured —
 * callers must NOT catch this and silently allow the request through; route
 * handlers should map it to a 500 with RATE_LIMIT_MISCONFIGURED_CODE.
 */
export async function checkRateLimit(
  name: string,
  config: RateLimitConfig,
  key: string,
): Promise<RateLimitResult> {
  const primary = await checkOneWindow(name, key, config);
  if (!primary.allowed) return primary;

  if (config.burst) {
    const burst = await checkOneWindow(`${name}:burst`, key, config.burst);
    if (!burst.allowed) return burst;
  }

  return primary;
}

/**
 * Builds the canonical rate-limit key. Prefers `userId:sessionId:action`;
 * falls back to a safely-parsed client IP only when unauthenticated, and
 * that fallback is itself bounded (see getTrustedClientIp) so it can't be
 * used to synthesize unlimited distinct keys.
 */
export function buildRateLimitKey(parts: {
  userId?: string | null;
  sessionId: string;
  action: string;
  ip?: string | null;
}): string {
  if (parts.userId) {
    return `${parts.userId}:${parts.sessionId}:${parts.action}`;
  }
  const ipPart = parts.ip ?? "anon";
  return `ip:${ipPart}:${parts.sessionId}:${parts.action}`;
}

/**
 * Returns a client IP only when the deployment has explicitly opted in via
 * TRUST_PROXY_HEADERS=true. Forwarded headers are trivially spoofable by any
 * direct client unless a trusted reverse proxy strips/overwrites them first,
 * so by default this returns null and callers fall back to a shared "anon"
 * bucket rather than trusting attacker-controlled header values.
 */
export function getTrustedClientIp(headers: Headers): string | null {
  if (process.env.TRUST_PROXY_HEADERS !== "true") return null;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && isIP(first)) return first;
  }
  for (const name of ["x-real-ip", "cf-connecting-ip"]) {
    const value = headers.get(name)?.trim();
    if (value && isIP(value)) return value;
  }
  return null;
}

/** Test-only: clears in-memory limiter state between test cases. */
export function __resetRateLimitStateForTests() {
  memoryStore.clear();
  limiterCache.clear();
  cachedRedis = undefined;
}
