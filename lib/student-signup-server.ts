// Public student signup — the only self-service account creation path.
// Staff/instructor accounts are always created by an admin (see
// lib/admin-user-server.ts), never through this endpoint.
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security/password";
import { encryptOptional } from "@/lib/security/encryption";

export interface StudentSignupPayload {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nidNumber: string;
  address: string;
  city: string;
  postalCode: string;
  password: string;
  courseId?: string;
}

export function normalizeStudentSignupPayload(input: unknown): StudentSignupPayload {
  const payload = (input ?? {}) as Partial<StudentSignupPayload>;

  if (!payload.fullName?.trim()) throw new Error("Full name is required.");
  if (!payload.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("A valid email is required.");
  }
  if (!payload.phone?.trim()) throw new Error("Phone number is required.");
  if (!payload.password || payload.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return {
    fullName: payload.fullName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    dateOfBirth: payload.dateOfBirth?.trim() ?? "",
    nidNumber: payload.nidNumber?.trim() ?? "",
    address: payload.address?.trim() ?? "",
    city: payload.city?.trim() ?? "",
    postalCode: payload.postalCode?.trim() ?? "",
    password: payload.password,
    courseId: payload.courseId?.trim() || undefined,
  };
}

export async function signUpStudent(payload: StudentSignupPayload) {
  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }

  const passwordHash = await hashPassword(payload.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.fullName,
        email: payload.email,
        phoneEnc: encryptOptional(payload.phone),
        passwordHash,
        role: "STUDENT",
        status: "PENDING",
        profile: {
          create: {
            dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
            nidNumberEnc: encryptOptional(payload.nidNumber),
            address: payload.address || null,
            city: payload.city || null,
            postalCode: payload.postalCode || null,
          },
        },
      },
    });

    if (payload.courseId) {
      const course = await tx.course.findUnique({ where: { id: payload.courseId } });
      if (course) {
        await tx.enrollment.create({
          data: {
            userId: user.id,
            courseId: payload.courseId,
            status: "PENDING",
          },
        });
      }
    }

    return { id: user.id, email: user.email, name: user.name };
  });
}
