import { prisma } from "@/lib/prisma";
import { decryptOptional } from "@/lib/security/encryption";
import { LearnerAuthError, requireLearner } from "@/lib/learner-auth-server";
import type { LearnerProfilePayload } from "@/lib/learner-profile-types";

export async function getLearnerProfile(): Promise<LearnerProfilePayload> {
  const currentUser = await requireLearner("/settings");

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phoneEnc: true,
      photoUrl: true,
      createdAt: true,
      lastActive: true,
      profile: {
        select: {
          dateOfBirth: true,
          nidNumberEnc: true,
          address: true,
          city: true,
          postalCode: true,
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!user || user.role !== "STUDENT") {
    throw new LearnerAuthError("Learner profile not found.", 404);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "STUDENT",
    status: user.status,
    phone: decryptOptional(user.phoneEnc),
    photoUrl: user.photoUrl,
    createdAt: user.createdAt.toISOString(),
    lastActive: user.lastActive ? user.lastActive.toISOString() : null,
    enrollmentCount: user._count.enrollments,
    profile: user.profile
      ? {
          dateOfBirth: user.profile.dateOfBirth
            ? user.profile.dateOfBirth.toISOString()
            : null,
          nidNumber: decryptOptional(user.profile.nidNumberEnc),
          address: user.profile.address ?? null,
          city: user.profile.city ?? null,
          postalCode: user.profile.postalCode ?? null,
        }
      : null,
  };
}
