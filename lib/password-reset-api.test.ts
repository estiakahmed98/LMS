import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(), getTrustedClientIp: () => "127.0.0.1" }));
vi.mock("@/lib/password-reset", () => ({
  digestToken: (value: string) => value,
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  resetEmailConfig: vi.fn(),
  RESET_MESSAGE: "If an account exists for this email address, a password reset link has been sent.",
  INVALID_RESET: "Invalid reset link",
}));
import { checkRateLimit } from "@/lib/rate-limit";
import { requestPasswordReset, resetPassword, RESET_MESSAGE } from "@/lib/password-reset";
import { POST as forgot } from "@/app/api/forgot-password/route";
import { POST as reset } from "@/app/api/reset-password/route";

const request = (body: unknown) => new Request("https://lms.example.com/api/reset-password", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, remaining: 2, resetAt: 0, retryAfterSeconds: 0, code: "RATE_LIMITED" });
});

it("normalizes email and returns the same public message for every account", async () => {
  for (const email of [" User@Example.com ", "unknown@example.com"]) {
    const response = await forgot(request({ email, callbackUrl: "/enroll/course1" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: RESET_MESSAGE });
    expect(requestPasswordReset).toHaveBeenLastCalledWith(email.trim().toLowerCase(), "/enroll/course1");
  }
});

it("rejects password confirmation mismatch before changing the password", async () => {
  const response = await reset(request({ token: "a".repeat(64), password: "new-password", confirmPassword: "different" }));
  expect(response.status).toBe(400);
  expect(resetPassword).not.toHaveBeenCalled();
});

it("blocks rate-limited requests before issuing reset tokens", async () => {
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetAt: 0, retryAfterSeconds: 60, code: "RATE_LIMITED" });
  const response = await forgot(request({ email: "user@example.com" }));
  expect(response.status).toBe(429);
  expect(response.headers.get("Retry-After")).toBe("60");
  expect(requestPasswordReset).not.toHaveBeenCalled();
});
