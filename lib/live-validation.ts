import { z } from "zod";
import { ApiError } from "@/lib/api-errors";

// ---------------------------------------------------------------------------
// Primitive parameter schemas
// ---------------------------------------------------------------------------

/** Prisma cuid()-generated ids used throughout the Live Classroom models. */
export const idSchema = z.string().trim().min(1).max(64);

export const sessionIdParam = idSchema;
export const userIdParam = idSchema;

export const liveActionEnum = z.enum([
  "join",
  "leave",
  "end",
  "hand",
  "send-message",
  "admit-participant",
  "reject-participant",
  "remove-participant",
  "lower-participant-hand",
  "recording-start",
  "recording-stop",
  "recording-finalize",
]);

export const handRaisedBody = z.object({
  raised: z.boolean(),
});

export const userIdBody = z.object({
  userId: idSchema,
});

export const recordingFinalizeBody = z.object({
  failed: z.boolean().optional().default(false),
  recordingAttemptId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

const MAX_CHAT_MESSAGE_CHARS = 1000;
/** Encoded (UTF-8) payload cap — generous headroom over 1000 chars of mostly-ASCII text. */
const MAX_CHAT_PAYLOAD_BYTES = 8 * 1024;

/** Rejects C0/C1 control characters other than newline/tab, which can break chat rendering or smuggle terminal escapes into logs. */
function hasDisallowedControlChars(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0)!;
    const isControl = (code <= 0x1f && code !== 0x0a && code !== 0x09) || (code >= 0x7f && code <= 0x9f);
    if (isControl) return true;
  }
  return false;
}

export const chatMessageBody = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(MAX_CHAT_MESSAGE_CHARS, `Message must be ${MAX_CHAT_MESSAGE_CHARS} characters or fewer.`)
    .refine((value) => !hasDisallowedControlChars(value), {
      message: "Message contains disallowed control characters.",
    })
    .refine((value) => new TextEncoder().encode(value).length <= MAX_CHAT_PAYLOAD_BYTES, {
      message: "Message is too large.",
    }),
  toUserId: idSchema.optional(),
  clientMessageId: z.string().uuid(),
});

export const messagesQuery = z.object({
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// ---------------------------------------------------------------------------
// Recording
// ---------------------------------------------------------------------------

export const recordingChunkQuery = z.object({
  seq: z.coerce.number().int().min(0),
  recordingAttemptId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Screen-share policy
// ---------------------------------------------------------------------------

export const sharePolicyBody = z.object({
  policy: z.enum(["HOST_ONLY", "ALL_PARTICIPANTS"]),
  allowedUserIds: z.array(idSchema).max(500).optional().default([]),
});

/** A bounded envelope; action-specific schemas validate their own fields. */
export const liveActionBody = z.looseObject({
  action: liveActionEnum.optional(),
});

// ---------------------------------------------------------------------------
// Request body parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parses a JSON body against `schema`, enforcing Content-Type and a byte-size
 * cap. Checks Content-Length up front when the header is present (avoids
 * buffering an oversized body at all); falls back to a post-read byte check
 * when it's absent, which is the best available guard given `request.text()`
 * must fully buffer to parse JSON.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 16 * 1024,
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(400, "INVALID_CONTENT_TYPE", "Content-Type must be application/json.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > maxBytes) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    }
  }

  const text = new TextDecoder().decode(await readRequestBytes(request, maxBytes));

  let json: unknown;
  try {
    json = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "MALFORMED_JSON", "Request body is not valid JSON.");
  }

  return schema.parse(json);
}

/** Reads a request stream while enforcing the limit before full buffering. */
export async function readRequestBytes(request: Request, maxBytes: number): Promise<Uint8Array> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (!Number.isFinite(declared) || declared < 0) {
      throw new ApiError(400, "INVALID_CONTENT_LENGTH", "Content-Length is invalid.");
    }
    if (declared > maxBytes) {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
    }
  }

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("payload too large");
        throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
