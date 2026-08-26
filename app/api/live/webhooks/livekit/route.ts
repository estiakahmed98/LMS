import { NextResponse } from "next/server";
import {
  processLiveKitWebhookEvent,
  verifyLiveKitWebhook,
} from "@/lib/livekit-webhook";
import { LiveRoomError } from "@/lib/live-room-error";
import { getRequestId, jsonError } from "@/lib/api-errors";
import { logLiveEvent } from "@/lib/live-observability";
import { checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { readRequestBytes } from "@/lib/live-validation";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const start = Date.now();

  try {
    const body = new TextDecoder().decode(await readRequestBytes(request, 1024 * 1024));
    const authHeader = request.headers.get("authorization");
    // Verify first: unsigned callers must not be able to exhaust the shared
    // provider bucket and lock out genuine LiveKit events.
    const event = await verifyLiveKitWebhook(body, authHeader);

    const ip = getTrustedClientIp(request.headers);
    const key = `webhook:${ip ?? "anon"}`;
    const result = await checkRateLimit("webhook", RATE_LIMITS.webhook, key);
    if (!result.allowed) {
      logLiveEvent({
        requestId,
        route: "POST /webhooks/livekit",
        status: 429,
        latencyMs: Date.now() - start,
        rateLimitResult: "limited",
      });
      return NextResponse.json(
        {
          error: "Too many webhook requests.",
          code: result.code,
          requestId,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
      );
    }

    const eventResult = await processLiveKitWebhookEvent(event);
    logLiveEvent({
      requestId,
      route: "POST /webhooks/livekit",
      status: 200,
      latencyMs: Date.now() - start,
    });
    return NextResponse.json({ received: true, ...eventResult });
  } catch (error) {
    if (error instanceof LiveRoomError) {
      logLiveEvent({
        requestId,
        route: "POST /webhooks/livekit",
        status: error.status,
        latencyMs: Date.now() - start,
      });
      return NextResponse.json(
        { error: error.message, code: "LIVE_ROOM_ERROR", requestId },
        { status: error.status },
      );
    }

    // WebhookReceiver.receive() throws a plain Error on a missing/invalid
    // signature — surface that as 401, not a generic 500.
    if (
      error instanceof Error &&
      (error.message.includes("authorization header") || error.message.includes("checksum"))
    ) {
      logLiveEvent({
        requestId,
        route: "POST /webhooks/livekit",
        status: 401,
        latencyMs: Date.now() - start,
      });
      return NextResponse.json(
        { error: "Invalid webhook signature.", code: "INVALID_WEBHOOK_SIGNATURE", requestId },
        { status: 401 },
      );
    }

    return jsonError(error, requestId);
  }
}
