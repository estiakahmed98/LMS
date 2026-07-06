// Admin/super-admin driven user management — this is the ONLY place
// staff/instructor accounts get created. The public /api/signup route
// only ever creates STUDENT accounts.
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password";
import { encryptOptional } from "@/lib/security/encryption";
import type {
  AdminUserCreatePayload,
  AdminUserStatusUpdatePayload,
  AdminUserSummary,
  UserRoleValue,
  UserStatusValue,
} from "@/lib/admin-user-types";
import { Prisma } from "@/lib/generated/prisma/client";

const roleValues: UserRoleValue[] = [
  "SUPER_ADMIN",
  "COURSE_MANAGER",
  "EXAMINER",
  "REPORT_VIEWER",
  "INSTRUCTOR",
  "STUDENT",
];

const statusValues: UserStatusValue[] = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "ACTIVE",
  "INACTIVE",
];

function serializeUser(
  user: Prisma.UserGetPayload<{ include: { enrollments: { select: { id: true } } } }>,
): AdminUserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastActive: user.lastActive ? user.lastActive.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    enrollmentCount: user.enrollments.length,
  };
}

export function normalizeUserCreatePayload(input: unknown): AdminUserCreatePayload {
  const payload = (input ?? {}) as Partial<AdminUserCreatePayload>;
  const role = String(payload.role ?? "").toUpperCase();

  if (!payload.name?.trim()) throw new Error("Name is required.");
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("A valid email is required.");
  }
  if (!payload.password || payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!roleValues.includes(role as UserRoleValue)) {
    throw new Error("Invalid role.");
  }

  return {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    role: role as UserRoleValue,
    phone: payload.phone?.trim() || undefined,
  };
}

export function normalizeStatusUpdatePayload(
  input: unknown,
): AdminUserStatusUpdatePayload {
  const payload = (input ?? {}) as Partial<AdminUserStatusUpdatePayload>;
  const status = String(payload.status ?? "").toUpperCase();

  if (!statusValues.includes(status as UserStatusValue)) {
    throw new Error("Invalid status.");
  }

  return { status: status as UserStatusValue };
}

export async function listUsers(role?: UserRoleValue) {
  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    include: { enrollments: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return users.map(serializeUser);
}

export async function createUser(payload: AdminUserCreatePayload) {
  const passwordHash = await hashPassword(payload.password);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      status: payload.role === "STUDENT" ? "PENDING" : "ACTIVE",
      phoneEnc: encryptOptional(payload.phone),
    },
    include: { enrollments: { select: { id: true } } },
  });

  return serializeUser(user);
}

export async function updateUserStatus(userId: string, status: UserStatusValue) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    include: { enrollments: { select: { id: true } } },
  });

  return serializeUser(user);
}

export async function deleteUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}
