import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  normalizeStudentSignupPayload,
  signUpStudent,
} from "@/lib/student-signup-server";

export async function POST(request: Request) {
  try {
    const payload = normalizeStudentSignupPayload(await request.json());
    const user = await signUpStudent(payload);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
