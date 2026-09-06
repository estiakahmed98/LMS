import { NextResponse } from "next/server";
import { checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { digestToken, requestPasswordReset, RESET_MESSAGE, resetEmailConfig } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const ipLimit = await checkRateLimit("forgot-password-ip", { limit: 10, window: "15 m" }, getTrustedClientIp(request.headers) ?? "anon");
    if (!ipLimit.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } });
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    resetEmailConfig();
    const emailLimit = await checkRateLimit("forgot-password-email", { limit: 3, window: "15 m" }, digestToken(email));
    if (emailLimit.allowed) await requestPasswordReset(email, body.callbackUrl);
    return NextResponse.json({ message: RESET_MESSAGE });
  } catch {
    console.error("PASSWORD_RESET_REQUEST_FAILED");
    return NextResponse.json({ error: "Password reset is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
