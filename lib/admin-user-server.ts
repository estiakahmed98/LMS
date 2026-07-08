// Admin/super-admin driven user management — this is the ONLY place
// staff/instructor accounts get created. The public /api/signup route
// only ever creates STUDENT accounts.
import { prisma } from "@/lib/prisma";
import { auditLogEntry } from "@/lib/audit";
import { hashPassword } from "@/lib/security/password";
import { encryptOptional, decryptOptional } from "@/lib/security/encryption";
import type {
  AdminUserCreatePayload,
  AdminUserDetail,
  AdminUserStatusUpdatePayload,
  AdminUserSummary,
  AdminUserUpdatePayload,
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

const userInclude = {
  enrollments: { select: { id: true, course: { select: { id: true, title: true } } } },
  liveClasses: { select: { course: { select: { id: true, title: true } } } },
} satisfies Prisma.UserInclude;

function serializeUser(
  user: Prisma.UserGetPayload<{ include: typeof userInclude }>,
): AdminUserSummary {
  const courseMap = new Map<string, string>();
  for (const enrollment of user.enrollments) {
    courseMap.set(enrollment.course.id, enrollment.course.title);
  }
  for (const liveClass of user.liveClasses) {
    courseMap.set(liveClass.course.id, liveClass.course.title);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastActive: user.lastActive ? user.lastActive.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    enrollmentCount: user.enrollments.length,
    courses: Array.from(courseMap, ([id, title]) => ({ id, title })),
  };
}

function serializeUserDetail(
  user: Prisma.UserGetPayload<{ include: typeof userInclude }>,
): AdminUserDetail {
  return {
    ...serializeUser(user),
    phone: decryptOptional(user.phoneEnc),
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

export function normalizeUserUpdatePayload(input: unknown): AdminUserUpdatePayload {
  const payload = (input ?? {}) as Partial<AdminUserUpdatePayload>;
  const role = String(payload.role ?? "").toUpperCase();

  if (!payload.name?.trim()) throw new Error("Name is required.");
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("A valid email is required.");
  }
  if (!roleValues.includes(role as UserRoleValue)) {
    throw new Error("Invalid role.");
  }

  return {
    name: payload.name.trim(),
    email: payload.email.trim().toLowerCase(),
    role: role as UserRoleValue,
    phone: payload.phone?.trim() || undefined,
  };
}

export async function listUsers(role?: UserRoleValue, courseId?: string) {
  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(courseId
        ? {
            OR: [
              { enrollments: { some: { courseId } } },
              { liveClasses: { some: { courseId } } },
            ],
          }
        : {}),
    },
    include: userInclude,
    orderBy: { createdAt: "desc" },
  });

  return users.map(serializeUser);
}

export async function createUser(
  payload: AdminUserCreatePayload,
  actorId: string | null = null,
) {
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
    include: userInclude,
  });

  await auditLogEntry({
    actorId,
    action: "user.created",
    entity: "User",
    entityId: user.id,
    changes: { name: payload.name, email: payload.email, role: payload.role },
  });

  return serializeUser(user);
}

export async function updateUserStatus(
  userId: string,
  status: UserStatusValue,
  actorId: string | null = null,
) {
  const previous = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    include: userInclude,
  });

  await auditLogEntry({
    actorId,
    action: "user.statusUpdated",
    entity: "User",
    entityId: user.id,
    changes: { from: previous?.status ?? null, to: status },
  });

  return serializeUser(user);
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });

  return user ? serializeUserDetail(user) : null;
}

export async function updateUser(
  userId: string,
  payload: AdminUserUpdatePayload,
  actorId: string | null = null,
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      phoneEnc: encryptOptional(payload.phone),
    },
    include: userInclude,
  });

  await auditLogEntry({
    actorId,
    action: "user.updated",
    entity: "User",
    entityId: user.id,
    changes: { name: payload.name, email: payload.email, role: payload.role },
  });

  return serializeUserDetail(user);
}

export async function deleteUser(userId: string, actorId: string | null = null) {
  await prisma.user.delete({ where: { id: userId } });

  await auditLogEntry({
    actorId,
    action: "user.deleted",
    entity: "User",
    entityId: userId,
  });
}
