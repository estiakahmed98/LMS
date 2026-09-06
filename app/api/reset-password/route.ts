import { NextResponse } from "next/server";
import { checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { INVALID_RESET, resetPassword } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const limit = await checkRateLimit("reset-password-ip", { limit: 10, window: "15 m" }, getTrustedClientIp(request.headers) ?? "anon");
    if (!limit.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const body = await request.json().catch(() => null);
    if (typeof body?.token !== "string") return NextResponse.json({ error: INVALID_RESET }, { status: 400 });
    if (typeof body.password !== "string" || body.password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    if (body.password !== body.confirmPassword) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    await resetPassword(body.token, body.password);
    return NextResponse.json({ message: "Your password has been reset successfully. Please sign in with your new password." });
  } catch (error) {
    if (error instanceof Error && error.message === INVALID_RESET) return NextResponse.json({ error: INVALID_RESET }, { status: 400 });
    return NextResponse.json({ error: "Password reset is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
