import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const limit = await checkRateLimit("forgot-password-check-email", { limit: 30, window: "15 m" }, getTrustedClientIp(request.headers) ?? "anon");
    if (!limit.allowed) return NextResponse.json({ error: "Too many checks. Please try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return NextResponse.json({ exists: Boolean(user) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to check email. Please try again later." }, { status: 503 });
  }
}
