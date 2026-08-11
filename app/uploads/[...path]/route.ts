//app/uploads/[...path]/route.ts
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadsRoot = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "uploads",
);

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webp": "image/webp",
};

function resolveUploadPath(segments: string[]) {
  if (
    segments.length === 0 ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("\0"),
    )
  ) {
    return null;
  }

  const filePath = path.resolve(
    /* turbopackIgnore: true */ uploadsRoot,
    ...segments,
  );
  return filePath.startsWith(`${uploadsRoot}${path.sep}`) ? filePath : null;
}

function parseRange(range: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match || (!match[1] && !match[2])) return null;

  let start: number;
  let end: number;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

async function serveUpload(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  headOnly: boolean,
) {
  const { path: segments } = await context.params;
  const filePath = resolveUploadPath(segments);
  if (!filePath) return new NextResponse(null, { status: 404 });

  let fileStats;
  try {
    fileStats = await stat(/* turbopackIgnore: true */ filePath);
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  if (!fileStats.isFile()) return new NextResponse(null, { status: 404 });

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type":
      contentTypes[path.extname(filePath).toLowerCase()] ??
      "application/octet-stream",
    "Last-Modified": fileStats.mtime.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  });

  const requestedRange = request.headers.get("range");
  const range = requestedRange
    ? parseRange(requestedRange, fileStats.size)
    : null;

  if (requestedRange && !range) {
    headers.set("Content-Range", `bytes */${fileStats.size}`);
    return new NextResponse(null, { status: 416, headers });
  }

  const start = range?.start ?? 0;
  const end = range?.end ?? fileStats.size - 1;
  const contentLength = Math.max(end - start + 1, 0);
  headers.set("Content-Length", String(contentLength));

  if (range) {
    headers.set("Content-Range", `bytes ${start}-${end}/${fileStats.size}`);
  }

  if (headOnly || fileStats.size === 0) {
    return new NextResponse(null, { status: range ? 206 : 200, headers });
  }

  const nodeStream = createReadStream(/* turbopackIgnore: true */ filePath, {
    start,
    end,
  });
  const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
  return new NextResponse(body, { status: range ? 206 : 200, headers });
}

export function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return serveUpload(request, context, false);
}

export function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return serveUpload(request, context, true);
}
