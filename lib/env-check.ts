export interface EnvCheckResult {
  ok: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_VARS = [
  "DATABASE_URL",
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
] as const;

const AUTH_VARS = ["AUTH_SECRET", "NEXTAUTH_SECRET"] as const;

/** Best-effort deploy readiness check (does not expose secret values). */
export function checkDeployEnv(): EnvCheckResult {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]?.trim()) missing.push(key);
  }

  const hasAuth = AUTH_VARS.some((key) => Boolean(process.env[key]?.trim()));
  if (!hasAuth) missing.push("AUTH_SECRET or NEXTAUTH_SECRET");

  const warnings: string[] = [];

  if (!process.env.LIVEKIT_S3_BUCKET?.trim()) {
    warnings.push(
      "LIVEKIT_S3_BUCKET not set — LiveKit egress recordings need cloud storage (R2/S3) or LiveKit Cloud storage.",
    );
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL?.trim() && !process.env.NEXTAUTH_URL?.trim()) {
    warnings.push("NEXT_PUBLIC_BASE_URL or NEXTAUTH_URL not set — auth callbacks may fail in production.");
  }

  return { ok: missing.length === 0, missing, warnings };
}
