import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      description: true,
      durationHours: true,
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found." }, { status: 404 });
  }

  return NextResponse.json({ course });
}