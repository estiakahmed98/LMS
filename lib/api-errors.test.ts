import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, getRequestId, jsonError } from "./api-errors";
import { LiveRoomError } from "./live-room-error";

async function bodyOf(response: Response) {
  return (await response.json()) as {
    error: string;
    code: string;
    requestId: string;
    retryAfterSeconds?: number;
  };
}

describe("jsonError", () => {
  it("maps ApiError to its declared status/code and sets Retry-After when present", async () => {
    const response = jsonError(
      new ApiError(429, "RATE_LIMITED", "Too many chat messages.", 8),
      "req-1",
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("8");
    const body = await bodyOf(response);
    expect(body).toEqual({
      error: "Too many chat messages.",
      code: "RATE_LIMITED",
      requestId: "req-1",
      retryAfterSeconds: 8,
    });
  });

  it("maps LiveRoomError to its status with a stable code", async () => {
    const response = jsonError(new LiveRoomError("Not found.", 404), "req-2");
    expect(response.status).toBe(404);
    const body = await bodyOf(response);
    expect(body.error).toBe("Not found.");
    expect(body.code).toBe("LIVE_ROOM_ERROR");
    expect(body.requestId).toBe("req-2");
    expect(body.retryAfterSeconds).toBeUndefined();
  });

  it("maps ZodError to 400/VALIDATION_ERROR using the first issue's message", async () => {
    const schema = z.object({ message: z.string().min(1, "Message cannot be empty.") });
    const parseResult = schema.safeParse({ message: "" });
    expect(parseResult.success).toBe(false);
    if (parseResult.success) return;

    const response = jsonError(parseResult.error, "req-3");
    expect(response.status).toBe(400);
    const body = await bodyOf(response);
    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.error).toBe("Message cannot be empty.");
  });

  it("maps unknown errors to a generic 500 without leaking internal details", async () => {
    const response = jsonError(new Error("some internal db connection string leaked here"), "req-4");
    expect(response.status).toBe(500);
    const body = await bodyOf(response);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.error).not.toContain("db connection string");
    expect(JSON.stringify(body)).not.toContain("at ");
  });
});

describe("getRequestId", () => {
  it("reuses an inbound x-request-id header when present", () => {
    const request = new Request("http://localhost/api/live/sessions/1", {
      headers: { "x-request-id": "trace-123" },
    });
    expect(getRequestId(request)).toBe("trace-123");
  });

  it("mints a fresh id when no header or request is given", () => {
    const id = getRequestId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
