import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";

export function handleQuestionBankApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
    if (error.code === "P2002") return NextResponse.json({ error: "A record with these values already exists." }, { status: 409 });
    if (error.code === "P2003") return NextResponse.json({ error: "A selected related record does not exist or is still in use." }, { status: 409 });
  }
  if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
