import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RateLimitConfigError,
  __resetRateLimitStateForTests,
  buildRateLimitKey,
  checkRateLimit,
  getTrustedClientIp,
} from "./rate-limit";

describe("rate-limit (in-memory dev/test fallback)", () => {
  beforeEach(() => {
    __resetRateLimitStateForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit and denies once exceeded", async () => {
    const key = "user1:session1:hand";
    const cfg = { limit: 3, window: "10 s" };

    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit("hand-test", cfg, key);
      expect(result.allowed).toBe(true);
    }

    const fourth = await checkRateLimit("hand-test", cfg, key);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
    expect(fourth.code).toBe("RATE_LIMITED");
  });

  it("isolates limits by key (different users/sessions/actions do not share a bucket)", async () => {
    const cfg = { limit: 1, window: "10 s" };

    const userA = await checkRateLimit("iso-test", cfg, "userA:session1:chat");
    const userB = await checkRateLimit("iso-test", cfg, "userB:session1:chat");
    const otherSession = await checkRateLimit("iso-test", cfg, "userA:session2:chat");
    const otherAction = await checkRateLimit("iso-test", cfg, "userA:session1:hand");

    expect(userA.allowed).toBe(true);
    expect(userB.allowed).toBe(true);
    expect(otherSession.allowed).toBe(true);
    expect(otherAction.allowed).toBe(true);

    const userARepeat = await checkRateLimit("iso-test", cfg, "userA:session1:chat");
    expect(userARepeat.allowed).toBe(false);
  });

  it("enforces a burst sub-window in addition to the primary window", async () => {
    const cfg = { limit: 30, window: "60 s", burst: { limit: 2, window: "5 s" } };
    const key = "userA:session1:chat";

    expect((await checkRateLimit("burst-test", cfg, key)).allowed).toBe(true);
    expect((await checkRateLimit("burst-test", cfg, key)).allowed).toBe(true);
    // Third call within the 5s burst window should be denied even though
    // the primary 60s/30 window has plenty of room left.
    const third = await checkRateLimit("burst-test", cfg, key);
    expect(third.allowed).toBe(false);
  });

  it("resets the window after it elapses", async () => {
    vi.useFakeTimers();
    const cfg = { limit: 1, window: "1 s" };
    const key = "userA:session1:hand";

    expect((await checkRateLimit("reset-test", cfg, key)).allowed).toBe(true);
    expect((await checkRateLimit("reset-test", cfg, key)).allowed).toBe(false);

    vi.advanceTimersByTime(1100);

    expect((await checkRateLimit("reset-test", cfg, key)).allowed).toBe(true);
  });

  it("throws RateLimitConfigError in production when Redis is not configured", async () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error -- test-only override of a readonly-typed env var
    process.env.NODE_ENV = "production";
    try {
      await expect(
        checkRateLimit("prod-test", { limit: 1, window: "10 s" }, "userA:session1:chat"),
      ).rejects.toBeInstanceOf(RateLimitConfigError);
    } finally {
      // @ts-expect-error -- restoring test-only override
      process.env.NODE_ENV = original;
    }
  });
});

describe("buildRateLimitKey", () => {
  it("prefers userId:sessionId:action when authenticated", () => {
    expect(
      buildRateLimitKey({ userId: "u1", sessionId: "s1", action: "chat", ip: "1.2.3.4" }),
    ).toBe("u1:s1:chat");
  });

  it("falls back to an IP-scoped key when unauthenticated", () => {
    expect(buildRateLimitKey({ sessionId: "s1", action: "chat", ip: "1.2.3.4" })).toBe(
      "ip:1.2.3.4:s1:chat",
    );
  });

  it("falls back to a shared anon bucket when no ip is available either", () => {
    expect(buildRateLimitKey({ sessionId: "s1", action: "chat" })).toBe("ip:anon:s1:chat");
  });
});

describe("getTrustedClientIp", () => {
  beforeEach(() => {
    delete process.env.TRUST_PROXY_HEADERS;
  });

  it("returns null when TRUST_PROXY_HEADERS is not enabled, even with a forwarded header present", () => {
    const headers = new Headers({ "x-forwarded-for": "9.9.9.9" });
    expect(getTrustedClientIp(headers)).toBeNull();
  });

  it("reads the first forwarded IP only when explicitly trusted", () => {
    process.env.TRUST_PROXY_HEADERS = "true";
    const headers = new Headers({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" });
    expect(getTrustedClientIp(headers)).toBe("9.9.9.9");
  });

  it("rejects malformed forwarded addresses even when proxy headers are trusted", () => {
    process.env.TRUST_PROXY_HEADERS = "true";
    const headers = new Headers({ "x-forwarded-for": "attacker-controlled-value" });
    expect(getTrustedClientIp(headers)).toBeNull();
  });
});
