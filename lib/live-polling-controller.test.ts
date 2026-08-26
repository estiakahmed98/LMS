import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PollingController } from "./live-polling-controller";

function okResponse(headers: Record<string, string> = {}) {
  return new Response("{}", { status: 200, headers });
}

function jsonResponse(status: number, headers: Record<string, string> = {}) {
  return new Response("{}", { status, headers });
}

// A fixed, non-zero random draw so jittered delays are deterministic in
// tests without being exactly equal to the un-jittered base value (which
// would silently pass even if jitter were broken). With this draw,
// jitterFraction = 0.1 + 0.25*(0.2-0.1) = 0.125 and sign is negative
// (0.25 < 0.5), so every delay comes out to base * 0.875.
const FIXED_RANDOM = () => 0.25;
const JITTER_MULTIPLIER = 0.875;

describe("PollingController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("never issues an overlapping request while one is in flight", async () => {
    let resolveFirst!: (value: Response) => void;
    let callCount = 0;
    const fetchFn = vi.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Promise.resolve(okResponse());
    });

    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult: () => {},
      onError: () => {},
      random: FIXED_RANDOM,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance well past when a second poll "would" fire if scheduling
    // ignored the in-flight request.
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    resolveFirst(okResponse());
    await vi.advanceTimersByTimeAsync(0);
    // Now the first call has settled and the next one is scheduled.
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(2);

    controller.stop();
  });

  it("aborts the in-flight request on stop()", async () => {
    let capturedSignal: AbortSignal | null = null;
    const fetchFn = vi.fn((signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<Response>(() => {}); // never resolves
    });

    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult: () => {},
      onError: () => {},
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(capturedSignal).not.toBeNull();
    expect(capturedSignal!.aborted).toBe(false);

    controller.stop();
    expect(capturedSignal!.aborted).toBe(true);
  });

  it("switches to the hidden interval when not visible", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(okResponse()));
    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult: () => {},
      onError: () => {},
      random: FIXED_RANDOM,
    });

    controller.notifyVisibility(false);
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Well past the visible interval but under the (jittered) hidden
    // interval — should NOT have fired again yet.
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(30000 * JITTER_MULTIPLIER);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    controller.stop();
  });

  it("triggers an immediate refresh when visibility is regained", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(okResponse()));
    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult: () => {},
      onError: () => {},
      random: FIXED_RANDOM,
    });

    controller.notifyVisibility(false);
    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    controller.notifyVisibility(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    controller.stop();
  });

  it("stops scheduling while offline and resumes immediately on online", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(okResponse()));
    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult: () => {},
      onError: () => {},
      random: FIXED_RANDOM,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    controller.notifyOnline(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    controller.notifyOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    controller.stop();
  });

  it("applies exponential backoff on repeated network errors and resets on success", async () => {
    let shouldFail = true;
    const fetchFn = vi.fn(() => {
      if (shouldFail) return Promise.reject(new Error("network down"));
      return Promise.resolve(okResponse());
    });
    const onError = vi.fn();

    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult: () => {},
      onError,
      random: FIXED_RANDOM,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledTimes(1);

    // Failure #1 -> 5000 * 0.875 = 4375ms until the next attempt.
    await vi.advanceTimersByTimeAsync(5625);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(2);

    // Failure #2 -> 10000 * 0.875 = 8750ms until the next attempt.
    await vi.advanceTimersByTimeAsync(11250);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenCalledTimes(3);

    // Now succeed on the next scheduled attempt (3rd failure's
    // 20000*0.875=17500ms backoff is already pending) — backoff should
    // reset to the base interval for the cycle after that.
    shouldFail = false;
    await vi.advanceTimersByTimeAsync(22500);
    expect(fetchFn).toHaveBeenCalledTimes(4);

    fetchFn.mockClear();
    // After success, next poll is base(1000) * 0.875 = 875ms, not another backoff step.
    await vi.advanceTimersByTimeAsync(700);
    expect(fetchFn).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    controller.stop();
  });

  it("honors the Retry-After header over computed backoff on a 429", async () => {
    const fetchFn = vi.fn(() => Promise.resolve(jsonResponse(429, { "Retry-After": "3" })));
    const onResult = vi.fn();

    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 1000,
      hiddenIntervalMs: 30000,
      onResult,
      onError: () => {},
      random: FIXED_RANDOM,
    });

    controller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onResult).toHaveBeenCalledTimes(1);

    // Retry-After: 3 -> 3000 * 0.875 = 2625ms, not the 1000ms base interval.
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    controller.stop();
  });

  it("applies jitter within the 10-20% bounds across many draws", async () => {
    const observedDelays: number[] = [];
    let lastCallTime = 0;

    const fetchFn = vi.fn(() => {
      observedDelays.push(Date.now() - lastCallTime);
      lastCallTime = Date.now();
      return Promise.resolve(okResponse());
    });

    // Deterministic pseudo-random sequence cycling through fractions so we
    // sample both ends of the jitter range instead of relying on Math.random.
    const sequence = [0, 0.25, 0.5, 0.75, 0.99];
    let i = 0;
    const random = () => sequence[i++ % sequence.length]!;

    const controller = new PollingController({
      fetchFn,
      baseIntervalMs: 10_000,
      hiddenIntervalMs: 30_000,
      onResult: () => {},
      onError: () => {},
      random,
    });

    lastCallTime = 0;
    controller.start();
    await vi.advanceTimersByTimeAsync(0);

    for (let n = 0; n < 10; n++) {
      await vi.advanceTimersByTimeAsync(15_000);
    }

    controller.stop();

    // Skip the first (delay 0, initial fire) and check every subsequent gap
    // falls within [10000*0.8, 10000*1.2] = [8000, 12000].
    for (const delay of observedDelays.slice(1)) {
      expect(delay).toBeGreaterThanOrEqual(8000);
      expect(delay).toBeLessThanOrEqual(12000);
    }
  });
});
