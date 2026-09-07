import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getLearnerAssessmentDetail,
  requireLearnerAccount,
} from "@/lib/learner-assessment-server";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const { assessmentId } = await params;
    const learner = await requireLearnerAccount("view");
    const detail = await getLearnerAssessmentDetail(learner.id, assessmentId);

    if (!detail.access?.canAttempt) {
      return NextResponse.json(
        { error: "This assessment is not currently available for submission." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please select a file." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF, DOC, DOCX, JPEG, PNG, or WebP files are allowed." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "The file must be 15 MB or smaller." },
        { status: 400 },
      );
    }

    const extension = path.extname(file.name).toLowerCase();
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const relativeDir = path.join("uploads", "assessment-submissions");
    const outputDir = path.join(process.cwd(), "public", relativeDir);
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      url: `/${relativeDir.replace(/\\/g, "/")}/${filename}`,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    if (error instanceof Error && "status" in error) {
      const learnerError = error as Error & { status: number };
      return NextResponse.json(
        { error: learnerError.message },
        { status: learnerError.status },
      );
    }
    console.error("LEARNER_ASSESSMENT_ATTACHMENT_UPLOAD_ERROR", error);
    return NextResponse.json({ error: "Failed to upload file." }, { status: 500 });
  }
}
