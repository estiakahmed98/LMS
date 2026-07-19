import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auditLogEntry, getActorId } from "@/lib/audit";
import { PermissionModule } from "@/lib/generated/prisma/enums";
import { RbacError, requirePermission } from "@/lib/rbac";

const allowedFolders = new Set([
  "courses",
  "course-modules",
  "course-resources",
  "recordings",
  "avatars",
]);

function sanitizeFolder(value: string | null) {
  if (!value || !allowedFolders.has(value)) {
    return "courses";
  }
  return value;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = sanitizeFolder(formData.get("folder")?.toString() ?? null);

    await requirePermission(
      folder === "avatars"
        ? PermissionModule.STUDENTS
        : PermissionModule.COURSES,
      "edit",
    );

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = path.extname(file.name) || "";
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const relativeDir = path.join("uploads", folder);
    const outputDir = path.join(process.cwd(), "public", relativeDir);

    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, filename), buffer);

    const url = `/${relativeDir.replace(/\\/g, "/")}/${filename}`;

    const actorId = await getActorId();
    await auditLogEntry({
      actorId,
      action: "upload.created",
      entity: "Upload",
      entityId: filename,
      changes: { folder, name: file.name, size: file.size, type: file.type, url },
    });

    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    if (error instanceof RbacError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("ADMIN_UPLOAD_ERROR", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
