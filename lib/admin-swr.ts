import { mutate } from "swr";
import { cache } from "swr/_internal";

const cachedAt = new Map<string, number>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Shares imperative admin loaders with SWR's cache. This is useful for the
 * existing action-heavy screens whose loaders are also called after mutations.
 */
export async function cachedAdminRequest<T>(
  key: string,
  loader: () => Promise<T>,
  maxAge = 60_000,
): Promise<T> {
  const state = cache.get(key) as { data?: T } | undefined;
  const timestamp = cachedAt.get(key) ?? 0;
  if (state?.data !== undefined && Date.now() - timestamp < maxAge) return state.data;

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = loader()
    .then(async (data) => {
      cachedAt.set(key, Date.now());
      await mutate(key, data, { revalidate: false });
      return data;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export async function adminJsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const body = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error(
      body && typeof body === "object" && "error" in body && body.error
        ? body.error
        : "Request failed.",
    );
  }
  return body as T;
}

type CachedResponse = {
  body: string;
  headers: [string, string][];
  status: number;
  statusText: string;
};

function responseFromCache(value: CachedResponse) {
  return new Response(value.body, {
    status: value.status,
    statusText: value.statusText,
    headers: value.headers,
  });
}

class AdminFetchResponseError extends Error {
  constructor(readonly response: CachedResponse) {
    super(`Admin request failed with ${response.status}.`);
  }
}

/** Drop-in fetch for admin client components: SWR-backed GETs plus mutation invalidation. */
export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const request = new Request(input, init);
  const method = request.method.toUpperCase();
  const url = new URL(request.url, window.location.origin);
  const key = `${url.pathname}${url.search}`;

  if (method === "GET" && url.origin === window.location.origin) {
    const maxAge = /\/api\/instructor\/sessions(\/|\?|$)/.test(key)
      ? 5_000
      : /\/api\/instructor\/dashboard(\/|\?|$)/.test(key)
        ? 15_000
        : /\/api\/learner\/dashboard(\/|\?|$)/.test(key)
          ? 15_000
          : /\/api\/learner\/assessments(\/|\?|$)/.test(key)
            ? 10_000
            : /\/api\/learner\/courses(\/|\?|$)/.test(key)
              ? 30_000
            : /\/api\/learner\/(profile|certificates|question-bank)(\/|\?|$)/.test(key)
              ? 300_000
              : /\/(activity-log|grading|submissions|notifications)(\/|\?|$)/.test(key)
          ? 10_000
          : /\/api\/instructor\/profile(\/|\?|$)/.test(key)
            ? 300_000
            : 60_000;
    try {
      const cached = await cachedAdminRequest<CachedResponse>(key, async () => {
        const response = await globalThis.fetch(request);
        const value = {
        body: await response.text(),
        headers: Array.from(response.headers.entries()),
        status: response.status,
        statusText: response.statusText,
        };
        if (!response.ok) throw new AdminFetchResponseError(value);
        return value;
      }, maxAge);
      return responseFromCache(cached);
    } catch (error) {
      if (error instanceof AdminFetchResponseError) return responseFromCache(error.response);
      throw error;
    }
  }

  const response = await globalThis.fetch(request);
  if (
    response.ok && method !== "GET" && method !== "HEAD" &&
    (url.pathname.startsWith("/api/admin/") ||
      url.pathname.startsWith("/api/instructor/") ||
      url.pathname.startsWith("/api/learner/"))
  ) {
    const root = url.pathname.split("/").slice(0, 4).join("/");
    await invalidateAdminSWR(
      root,
      url.pathname,
      ...(url.pathname.startsWith("/api/learner/") ? ["/api/learner/"] : []),
      "/api/admin/dashboard",
      "/api/admin/reports",
    );
  }
  return response;
}

export const instructorFetch = adminFetch;

export async function learnerFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const rawUrl = input instanceof Request ? input.url : String(input);
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
  const url = new URL(rawUrl, origin);
  const isDynamicGet = method === "GET" && (
    url.pathname === "/api/learner/dashboard" ||
    url.pathname === "/api/learner/live-classes" ||
    url.pathname.startsWith("/api/learner/notifications") ||
    /^\/api\/learner\/courses\/[^/]+\/modules\/[^/]+$/.test(url.pathname) ||
    /^\/api\/learner\/assessments\/[^/]+(?:\/attachments)?$/.test(url.pathname)
  );
  return isDynamicGet ? globalThis.fetch(input, init) : adminFetch(input, init);
}

/** Revalidates every cached admin GET whose URL starts with one of the prefixes. */
export async function invalidateAdminSWR(...prefixes: string[]) {
  for (const key of cachedAt.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) cachedAt.delete(key);
  }
  await mutate(
    (key) => typeof key === "string" && prefixes.some((prefix) => key.startsWith(prefix)),
    undefined,
    { revalidate: true },
  );
}
