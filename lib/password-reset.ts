import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export const RESET_MESSAGE = "If an account exists for this email address, a password reset link has been sent.";
export const INVALID_RESET = "This password reset link is invalid or expired. Please request a new link.";
export const digestToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function resetEmailConfig() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM;
  const origin = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (!key || !from || !origin) throw new Error("Password reset email is not configured.");
  const url = new URL(origin);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) throw new Error("Invalid password reset origin.");
  return { key, from, origin: url.origin };
}

export async function requestPasswordReset(email: string, callbackUrl: unknown) {
  const config = resetEmailConfig();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;
  const token = randomBytes(32).toString("hex");
  const tokenHash = digestToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tokenHash, expiresAt },
    update: { tokenHash, expiresAt },
  });
  const url = new URL("/reset-password", config.origin);
  url.searchParams.set("token", token);
  const callback = safeCallbackUrl(callbackUrl);
  if (callback) url.searchParams.set("callbackUrl", callback);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: [user.email], subject: "Reset your BOED LMS password", text: `Reset your password using this link (valid for 30 minutes):\n\n${url}\n\nIf you did not request this, you can ignore this email.` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Email delivery failed.");
  } catch {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash } });
    // Never log the provider response or reset URL, and keep public responses generic.
    console.error("PASSWORD_RESET_EMAIL_DELIVERY_FAILED");
  }
}

export async function resetPassword(token: string, password: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error(INVALID_RESET);
  const tokenHash = digestToken(token);
  const entry = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!entry || entry.expiresAt <= new Date()) throw new Error(INVALID_RESET);
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (tx) => {
    // Atomic consumption prevents concurrent requests from reusing the same link.
    const consumed = await tx.passwordResetToken.deleteMany({ where: { tokenHash, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new Error(INVALID_RESET);
    await tx.user.update({ where: { id: entry.userId }, data: { passwordHash } });
  });
}
