/**
 * Pure request-completion-based polling scheduler — no React, no DOM APIs
 * beyond what's passed in, so this is unit-testable with fake timers.
 * `hooks/use-live-polling.ts` wires this to visibility/online events and
 * React state.
 */

export interface PollingControllerOptions {
  /** Performs one poll attempt; must respect the given AbortSignal. */
  fetchFn: (signal: AbortSignal) => Promise<Response>;
  /** Interval while the tab is visible and online, before jitter. */
  baseIntervalMs: number;
  /** Interval while the tab is hidden, before jitter. */
  hiddenIntervalMs: number;
  onResult: (response: Response) => void;
  onError: (error: unknown) => void;
  /** Defaults to Math.random; overridable for deterministic tests. */
  random?: () => number;
}

const BACKOFF_STEPS_MS = [5_000, 10_000, 20_000, 30_000, 60_000];
const JITTER_MIN = 0.1;
const JITTER_MAX = 0.2;

function applyJitter(baseMs: number, random: () => number): number {
  const jitterFraction = JITTER_MIN + random() * (JITTER_MAX - JITTER_MIN);
  const sign = random() < 0.5 ? -1 : 1;
  return Math.max(0, Math.round(baseMs * (1 + sign * jitterFraction)));
}

export class PollingController {
  private readonly options: PollingControllerOptions;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private inFlight = false;
  private stopped = true;
  private visible = true;
  private online = true;
  private backoffIndex = -1;
  private forcedDelayMs: number | null = null;

  constructor(options: PollingControllerOptions) {
    this.options = options;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.scheduleNext(0);
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.abortController?.abort();
    this.abortController = null;
  }

  notifyVisibility(visible: boolean): void {
    const wasHidden = !this.visible;
    this.visible = visible;
    if (visible && wasHidden && !this.stopped) {
      // Immediate refresh on regaining visibility.
      this.runNow();
    }
  }

  notifyOnline(online: boolean): void {
    const wasOffline = !this.online;
    this.online = online;
    if (online && wasOffline && !this.stopped) {
      this.runNow();
    } else if (!online && this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private runNow(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.scheduleNext(0);
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runOnce();
    }, delayMs);
  }

  private async runOnce(): Promise<void> {
    if (this.stopped) return;
    if (!this.online) return; // stay paused until an online event resumes us
    if (this.inFlight) return; // never overlap requests

    this.inFlight = true;
    const controller = new AbortController();
    this.abortController = controller;

    try {
      const response = await this.options.fetchFn(controller.signal);
      this.abortController = null;
      this.inFlight = false;
      if (this.stopped) return;

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        this.forcedDelayMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : this.nextBackoffMs();
        this.options.onResult(response);
        this.scheduleNext(this.consumeDelay());
        return;
      }

      if (response.status >= 500) {
        this.forcedDelayMs = this.nextBackoffMs();
        this.options.onResult(response);
        this.scheduleNext(this.consumeDelay());
        return;
      }

      // Success: reset backoff and go back to the steady-state interval.
      this.backoffIndex = -1;
      this.forcedDelayMs = null;
      this.options.onResult(response);
      this.scheduleNext(this.consumeDelay());
    } catch (error) {
      this.abortController = null;
      this.inFlight = false;
      if (this.stopped) return;
      if (controller.signal.aborted) return; // stale/unmounted request, not a real failure

      this.forcedDelayMs = this.nextBackoffMs();
      this.options.onError(error);
      this.scheduleNext(this.consumeDelay());
    }
  }

  private nextBackoffMs(): number {
    this.backoffIndex = Math.min(this.backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
    return BACKOFF_STEPS_MS[this.backoffIndex]!;
  }

  /** Consumes any forced (backoff/Retry-After) delay, else the steady-state interval, with jitter applied. */
  private consumeDelay(): number {
    const random = this.options.random ?? Math.random;
    if (this.forcedDelayMs !== null) {
      const delay = this.forcedDelayMs;
      this.forcedDelayMs = null;
      // Retry-After/backoff is a minimum. Add positive jitter only so the
      // client never retries earlier than the server explicitly allowed.
      const positiveJitter = JITTER_MIN + random() * (JITTER_MAX - JITTER_MIN);
      return Math.round(delay * (1 + positiveJitter));
    }
    const base = this.visible ? this.options.baseIntervalMs : this.options.hiddenIntervalMs;
    return applyJitter(base, random);
  }
}
