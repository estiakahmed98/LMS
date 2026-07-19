import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  InstructorAuthError,
  requireInstructor,
  updateInstructorProfile,
} from "@/lib/instructor-server";

const MAX_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const instructor = await requireInstructor({
      module: "SETTINGS",
      action: "edit",
    });
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }
    if (!allowedTypes.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, or GIF images are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const relativeDir = path.join("uploads", "avatars");
    const outputDir = path.join(process.cwd(), "public", relativeDir);

    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, filename), buffer);

    const url = `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
    const profile = await updateInstructorProfile(instructor.id, { photoUrl: url });

    return NextResponse.json({ url, profile });
  } catch (error) {
    if (error instanceof InstructorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("INSTRUCTOR_PHOTO_UPLOAD_ERROR", error);
    return NextResponse.json({ error: "Failed to upload photo." }, { status: 500 });
  }
}
