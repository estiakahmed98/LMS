import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  Role,
  UserStatus,
  EnrollmentStatus,
} from "@/lib/generated/prisma/client";
import { hashPassword } from "@/lib/security/password";
import { encryptOptional  } from "@/lib/security/encryption";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      nidNumber,
      address,
      city,
      postalCode,
      password,
      courseId,
    } = body;

    if (!fullName || !email || !password || !courseId) {
      return NextResponse.json(
        { error: "Required fields are missing." },
        { status: 400 },
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found." },
        { status: 404 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { enrollments: true },
    });

    if (existingUser) {
      await prisma.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: existingUser.id,
            courseId,
          },
        },
        update: {},
        create: {
          userId: existingUser.id,
          courseId,
          status: EnrollmentStatus.PENDING,
        },
      });

      return NextResponse.json({
        user: { email: existingUser.email },
        message: "Enrollment submitted.",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: fullName,
        email,
        phoneEnc: phone ? encryptOptional (phone) : null,
        passwordHash,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,

        profile: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            nidNumberEnc: nidNumber ? encryptOptional (nidNumber) : null,
            address,
            city,
            postalCode,
          },
        },

        enrollments: {
          create: {
            courseId,
            status: EnrollmentStatus.PENDING,
            progress: 0,
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("SIGNUP_ERROR", error);

    return NextResponse.json(
      { error: "Failed to create your account." },
      { status: 500 },
    );
  }
}