import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, NextResponse } from "next/server";
import { auditLogEntry, getActorId } from "@/lib/audit";
import { handleQuestionBankApiError } from "@/lib/question-bank-api";
import { runExtractionJob } from "@/lib/question-bank-extraction";
import { createImportJob } from "@/lib/question-bank-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
    }
    if (file.size > 32 * 1024 * 1024) return NextResponse.json({ error: "PDF must be 32 MB or smaller." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${randomUUID()}.pdf`;
    const relativeDir = path.join("uploads", "question-bank");
    await mkdir(path.join(process.cwd(), "public", relativeDir), { recursive: true });
    await writeFile(path.join(process.cwd(), "public", relativeDir, filename), buffer);
    const fileUrl = `/${relativeDir.replace(/\\/g, "/")}/${filename}`;
    const actorId = await getActorId();
    const job = await createImportJob(file.name, fileUrl, actorId);
    await auditLogEntry({ actorId, action: "upload.created", entity: "Upload", entityId: filename, changes: { folder: "question-bank", name: file.name, size: file.size, type: file.type, url: fileUrl } });
    after(() => runExtractionJob(job.id, buffer));
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (error) { return handleQuestionBankApiError(error); }
}
