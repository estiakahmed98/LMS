const baseUrl = (process.env.LOAD_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sessionId = process.env.LOAD_SESSION_ID?.trim();
const cookies = (process.env.LOAD_AUTH_COOKIES ?? "")
  .split("||")
  .map((value) => value.trim())
  .filter(Boolean);
const concurrency = Math.max(1, Math.min(100, Number(process.env.LOAD_CONCURRENCY ?? 30)));
const iterations = Math.max(1, Math.min(100, Number(process.env.LOAD_ITERATIONS ?? 10)));

if (!sessionId || cookies.length === 0) {
  throw new Error(
    "Set LOAD_SESSION_ID and LOAD_AUTH_COOKIES (use || between multiple session cookies).",
  );
}
if (/^https:\/\//i.test(baseUrl) && process.env.ALLOW_PRODUCTION_LOAD_TEST !== "true") {
  throw new Error(
    "HTTPS targets are blocked by default. Set ALLOW_PRODUCTION_LOAD_TEST=true only for an authorized test environment.",
  );
}

const latencies = [];
let failures = 0;
let limited = 0;

async function worker(workerIndex) {
  const cookie = cookies[workerIndex % cookies.length];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const started = performance.now();
    const response = await fetch(
      `${baseUrl}/api/live/sessions/${encodeURIComponent(sessionId)}?resource=state`,
      { headers: { cookie } },
    );
    latencies.push(performance.now() - started);
    if (response.status === 429) limited += 1;
    else if (!response.ok) failures += 1;
    await response.arrayBuffer();
  }
}

await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index)));
latencies.sort((a, b) => a - b);
const percentile = (value) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * value))] ?? 0;

const result = {
  requests: latencies.length,
  concurrency,
  iterations,
  failures,
  rateLimited: limited,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  p99Ms: Math.round(percentile(0.99)),
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures > 0) process.exitCode = 1;
