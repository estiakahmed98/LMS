import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  passwordResetToken: { upsert: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { digestToken, INVALID_RESET, requestPasswordReset, resetPassword } from "@/lib/password-reset";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { safeCallbackUrl } from "@/lib/auth-redirect";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("PASSWORD_RESET_FROM", "test@example.com");
  vi.stubEnv("AUTH_URL", "https://lms.example.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  db.$transaction.mockImplementation((work) => work(db));
});

describe("password recovery", () => {
  it("stores only a hash and emails an expiring link with the destination", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u1", email: "user@example.com" });
    await requestPasswordReset("user@example.com", "/enroll/course1");
    const saved = db.passwordResetToken.upsert.mock.calls[0][0].create;
    const mail = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    const link = new URL(mail.text.split("\n\n")[1]);
    const raw = link.searchParams.get("token")!;
    expect(saved.tokenHash).toBe(digestToken(raw));
    expect(saved.tokenHash).not.toBe(raw);
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(saved.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 60_000);
    expect(link.searchParams.get("callbackUrl")).toBe("/enroll/course1");
  });

  it("does not send email or create a token for an unknown account", async () => {
    db.user.findUnique.mockResolvedValue(null);
    await requestPasswordReset("unknown@example.com", null);
    expect(fetch).not.toHaveBeenCalled();
    expect(db.passwordResetToken.upsert).not.toHaveBeenCalled();
  });

  it.each([null, { userId: "u1", expiresAt: new Date(0) }])("rejects missing/used and expired tokens", async (entry) => {
    db.passwordResetToken.findUnique.mockResolvedValue(entry);
    await expect(resetPassword("a".repeat(64), "new-password")).rejects.toThrow(INVALID_RESET);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("rejects malformed tokens and weak passwords", async () => {
    await expect(resetPassword("bad", "new-password")).rejects.toThrow(INVALID_RESET);
    db.passwordResetToken.findUnique.mockResolvedValue({ userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    await expect(resetPassword("a".repeat(64), "short")).rejects.toThrow("at least 8");
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("atomically consumes a link and replaces the password using the login hasher", async () => {
    const oldHash = await hashPassword("old-password");
    db.passwordResetToken.findUnique.mockResolvedValue({ userId: "u1", expiresAt: new Date(Date.now() + 60_000) });
    db.passwordResetToken.deleteMany.mockResolvedValue({ count: 1 });
    await resetPassword("a".repeat(64), "new-password");
    const newHash = db.user.update.mock.calls[0][0].data.passwordHash;
    expect(await verifyPassword(newHash, "new-password")).toBe(true);
    expect(await verifyPassword(newHash, "old-password")).toBe(false);
    expect(newHash).not.toBe(oldHash);
    db.user.update.mockClear();
    db.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    await expect(resetPassword("a".repeat(64), "another-password")).rejects.toThrow(INVALID_RESET);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});

it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/login", "/forgot-password"])("blocks unsafe callback %s", (value) => {
  expect(safeCallbackUrl(value)).toBeNull();
});
