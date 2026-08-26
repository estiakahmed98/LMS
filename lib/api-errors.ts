import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LiveRoomError } from "@/lib/live-room-error";
import { RateLimitConfigError } from "@/lib/rate-limit";
import { logLiveEvent } from "@/lib/live-observability";

/**
 * Application-level error carrying an HTTP status, a stable machine-readable
 * code, and an optional Retry-After hint. Route handlers throw this (or
 * LiveRoomError / ZodError, both mapped below) and call `jsonError` once in
 * a top-level catch instead of hand-rolling a response per error site.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ApiErrorBody {
  error: string;
  code: string;
  requestId: string;
  retryAfterSeconds?: number;
}

/** Reads an inbound trace header if present, otherwise mints a fresh id. */
export function getRequestId(request?: Request): string {
  const inbound = request?.headers.get("x-request-id");
  return inbound && inbound.trim() ? inbound.trim() : crypto.randomUUID();
}

function toApiShape(error: unknown, requestId: string): {
  status: number;
  body: ApiErrorBody;
} {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        code: error.code,
        requestId,
        ...(error.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: error.retryAfterSeconds }
          : {}),
      },
    };
  }

  if (error instanceof RateLimitConfigError) {
    logLiveEvent({
      route: "unknown",
      status: 500,
      requestId,
      message: "RATE_LIMIT_MISCONFIGURED",
    });
    return {
      status: 500,
      body: {
        error: "Rate limiting is not configured correctly on the server.",
        code: error.code,
        requestId,
      },
    };
  }

  if (error instanceof LiveRoomError) {
    return {
      status: error.status,
      body: { error: error.message, code: "LIVE_ROOM_ERROR", requestId },
    };
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid request.";
    return {
      status: 400,
      body: { error: message, code: "VALIDATION_ERROR", requestId },
    };
  }

  // Unknown error: never leak stack traces or internal messages to the client.
  console.error("LIVE_API_UNHANDLED_ERROR", requestId, error);
  return {
    status: 500,
    body: {
      error: "Something went wrong while processing your request.",
      code: "INTERNAL_ERROR",
      requestId,
    },
  };
}

/**
 * Single shared error-response helper for every Live Classroom API route.
 * Always returns the standard { error, code, requestId, retryAfterSeconds? }
 * shape and sets Retry-After when the error carries one.
 */
export function jsonError(error: unknown, requestId: string): NextResponse {
  const { status, body } = toApiShape(error, requestId);
  const headers: HeadersInit = {};
  if (body.retryAfterSeconds !== undefined) {
    headers["Retry-After"] = String(body.retryAfterSeconds);
  }
  return NextResponse.json(body, { status, headers });
}
