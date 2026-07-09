import { NextResponse } from "next/server";
import { checkDeployEnv } from "@/lib/env-check";

export async function GET() {
  const env = checkDeployEnv();

  return NextResponse.json({
    status: env.ok ? "ok" : "degraded",
    env: {
      ok: env.ok,
      missing: env.missing,
      warnings: env.warnings,
    },
    timestamp: new Date().toISOString(),
  });
}
