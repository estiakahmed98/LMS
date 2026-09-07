"use client";

import { Download, FileText } from "lucide-react";

export function AttachmentPreview({
  attachment,
  index,
  fileName,
}: {
  attachment: string;
  index: number;
  fileName: string | null;
}) {
  const cleanPath = attachment.split(/[?#]/)[0].toLowerCase();
  const urlFileName = cleanPath.startsWith("data:")
    ? ""
    : decodeURIComponent(cleanPath.split("/").at(-1) ?? "");
  const dataType = attachment.match(/^data:([^;,]+)/i)?.[1].toLowerCase();
  const extension =
    dataType === "application/pdf"
      ? "pdf"
      : dataType === "application/msword"
        ? "doc"
        : dataType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ? "docx"
          : dataType?.startsWith("image/")
            ? dataType.split("/")[1].replace("jpeg", "jpg")
            : "file";
  const displayName =
    fileName ||
    urlFileName ||
    (dataType?.startsWith("image/")
      ? `Evidence image ${index}.${extension}`
      : `Attachment ${index + 1}.${extension}`);

  return (
    <article className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </span>
        <p className="min-w-0 truncate text-sm font-semibold" title={displayName}>
          {displayName}
        </p>
      </div>
        <a
          href={attachment}
          download={displayName}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
    </article>
  );
}
