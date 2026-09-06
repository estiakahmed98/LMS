import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ course: { findUnique: vi.fn() }, user: { findUnique: vi.fn(), create: vi.fn() }, enrollment: { upsert: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/security/password", () => ({ hashPassword: vi.fn().mockResolvedValue("hash") }));
vi.mock("@/lib/security/encryption", () => ({ encryptOptional: vi.fn() }));
import { POST } from "@/app/api/signup/route";
import { Prisma } from "@/lib/generated/prisma/client";

const request = () => new Request("http://localhost/api/signup", { method: "POST", body: JSON.stringify({ fullName: "Test", email: " USER@Example.com ", password: "password123", courseId: "course1" }) });
beforeEach(() => { vi.clearAllMocks(); db.course.findUnique.mockResolvedValue({ id: "course1" }); });

it("rejects normalized existing email without modifying users or enrollments", async () => {
  db.user.findUnique.mockResolvedValue({ id: "existing" });
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
  expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: "user@example.com" }, select: { id: true } });
  expect(db.user.create).not.toHaveBeenCalled();
  expect(db.enrollment.upsert).not.toHaveBeenCalled();
});

it("handles concurrent duplicate creation as a conflict", async () => {
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "7" }));
  expect((await POST(request())).status).toBe(409);
});

it("still creates a new account using normalized email", async () => {
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockResolvedValue({ id: "new", email: "user@example.com" });
  expect((await POST(request())).status).toBe(201);
  expect(db.user.create.mock.calls[0][0].data.email).toBe("user@example.com");
});
