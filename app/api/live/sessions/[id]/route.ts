import { NextResponse } from "next/server";
import {
  broadcastLiveRoomInvalidation,
  createLiveKitToken,
} from "@/lib/livekit-server";
import {
  appendLiveRecordingChunk,
  finalizeLiveRecording,
  MAX_CHUNK_BYTES,
} from "@/lib/live-local-recording-server";
import {
  admitLiveRoomParticipant,
  endLiveRoom,
  getLiveRoom,
  getLiveRoomState,
  getLiveRoomMessages,
  joinLiveRoom,
  leaveLiveRoom,
  lowerLiveRoomParticipantHand,
  rejectLiveRoomWaitingUser,
  removeLiveRoomParticipant,
  sendLiveRoomMessage,
  setLiveRoomHandRaised,
  startLiveRoomRecording,
  stopLiveRoomRecording,
} from "@/lib/live-room-server";
import { auth } from "@/auth";
import { ApiError, getRequestId, jsonError } from "@/lib/api-errors";
import { logLiveEvent } from "@/lib/live-observability";
import { buildRateLimitKey, checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import {
  chatMessageBody,
  handRaisedBody,
  liveActionBody,
  liveActionEnum,
  messagesQuery,
  parseJsonBody,
  readRequestBytes,
  recordingChunkQuery,
  recordingFinalizeBody,
  sessionIdParam,
  userIdBody,
} from "@/lib/live-validation";

async function getUserIdForRateLimit(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

async function rateLimit(
  request: Request,
  sessionId: string,
  action: string,
  config: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS],
) {
  const userId = await getUserIdForRateLimit();
  const ip = getTrustedClientIp(request.headers);
  const key = buildRateLimitKey({ userId, sessionId, action, ip });
  const result = await checkRateLimit(action, config, key);
  if (!result.allowed) {
    throw new ApiError(
      429,
      result.code,
      "Too many requests. Please wait before trying again.",
      result.retryAfterSeconds,
    );
  }
}

async function rateLimitGlobally(request: Request, sessionId: string) {
  await rateLimit(request, "_all", "liveApiGlobal", RATE_LIMITS.liveApiGlobal);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const start = Date.now();
  try {
    const { id: rawId } = await context.params;
    const id = sessionIdParam.parse(rawId);
    await rateLimitGlobally(request, id);
    const resource = new URL(request.url).searchParams.get("resource");

    if (resource === "livekit-token") {
      await rateLimit(request, id, "livekitToken", RATE_LIMITS.livekitToken);
      const payload = await createLiveKitToken(id);
      logLiveEvent({
        requestId,
        route: "GET /sessions/[id]",
        action: "livekit-token",
        sessionId: id,
        status: 200,
        latencyMs: Date.now() - start,
      });
      return NextResponse.json(payload);
    }

    if (resource === "messages") {
      await rateLimit(request, id, "messageRead", RATE_LIMITS.messageRead);
      const query = messagesQuery.parse({
        cursor: new URL(request.url).searchParams.get("cursor") ?? undefined,
        limit: new URL(request.url).searchParams.get("limit") ?? undefined,
      });
      return NextResponse.json(await getLiveRoomMessages(id, query));
    }

    await rateLimit(request, id, "roomState", RATE_LIMITS.roomState);
    const room = resource === "state" ? await getLiveRoomState(id) : await getLiveRoom(id);
    logLiveEvent({
      requestId,
      route: "GET /sessions/[id]",
      action: "state",
      sessionId: id,
      status: 200,
      latencyMs: Date.now() - start,
    });
    return NextResponse.json(room);
  } catch (error) {
    return jsonError(error, requestId);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const start = Date.now();
  let id = "unknown";
  try {
    ({ id } = await context.params);
    id = sessionIdParam.parse(id);
    await rateLimitGlobally(request, id);
    const url = new URL(request.url);
    const queryAction = url.searchParams.get("action");

    if (queryAction === "recording-chunk") {
      await rateLimit(request, id, "recordingChunk", RATE_LIMITS.recordingChunk);

      const contentType = request.headers.get("content-type") ?? "";
      if (!contentType.includes("application/octet-stream")) {
        throw new ApiError(
          400,
          "INVALID_CONTENT_TYPE",
          "Content-Type must be application/octet-stream.",
        );
      }

      const contentLength = request.headers.get("content-length");
      if (contentLength) {
        const declared = Number(contentLength);
        if (Number.isFinite(declared) && declared > MAX_CHUNK_BYTES) {
          throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Recording chunk is too large.");
        }
      }

      const { seq, recordingAttemptId } = recordingChunkQuery.parse({
        seq: url.searchParams.get("seq"),
        recordingAttemptId: url.searchParams.get("recordingAttemptId"),
      });

      const data = Buffer.from(await readRequestBytes(request, MAX_CHUNK_BYTES));
      await appendLiveRecordingChunk(id, seq, recordingAttemptId, data);
      logLiveEvent({
        requestId,
        route: "POST /sessions/[id]",
        action: "recording-chunk",
        sessionId: id,
        recordingAttemptId,
        seq,
        status: 200,
        latencyMs: Date.now() - start,
      });
      return NextResponse.json({ ok: true });
    }

    const rawBody = await parseJsonBody(request, liveActionBody);
    const action = liveActionEnum.parse(queryAction ?? rawBody.action);

    switch (action) {
      case "join": {
        await rateLimit(request, id, "join", RATE_LIMITS.join);
        const result = await joinLiveRoom(id);
        return finish(result);
      }
      case "leave": {
        await rateLimit(request, id, "leave", RATE_LIMITS.leave);
        await leaveLiveRoom(id);
        return finish({ ok: true });
      }
      case "end": {
        await rateLimit(request, id, "hostAction", RATE_LIMITS.hostAction);
        const result = await endLiveRoom(id);
        return finish(result);
      }
      case "hand": {
        await rateLimit(request, id, "hand", RATE_LIMITS.hand);
        const body = handRaisedBody.parse(rawBody);
        const result = await setLiveRoomHandRaised(id, body.raised);
        return finish(result);
      }
      case "send-message": {
        await rateLimit(request, id, "chat", RATE_LIMITS.chat);
        await rateLimit(request, id, "chatBurst", RATE_LIMITS.chatBurst);
        const body = chatMessageBody.parse(rawBody);
        const result = await sendLiveRoomMessage(
          id,
          body.message,
          body.toUserId,
          body.clientMessageId,
        );
        return finish(result);
      }
      case "admit-participant": {
        await rateLimit(request, id, "hostAction", RATE_LIMITS.hostAction);
        const body = userIdBody.parse(rawBody);
        const result = await admitLiveRoomParticipant(id, body.userId);
        return finish(result);
      }
      case "reject-participant": {
        await rateLimit(request, id, "hostAction", RATE_LIMITS.hostAction);
        const body = userIdBody.parse(rawBody);
        const result = await rejectLiveRoomWaitingUser(id, body.userId);
        return finish(result);
      }
      case "remove-participant": {
        await rateLimit(request, id, "hostAction", RATE_LIMITS.hostAction);
        const body = userIdBody.parse(rawBody);
        const result = await removeLiveRoomParticipant(id, body.userId);
        return finish(result);
      }
      case "lower-participant-hand": {
        await rateLimit(request, id, "hostAction", RATE_LIMITS.hostAction);
        const body = userIdBody.parse(rawBody);
        const result = await lowerLiveRoomParticipantHand(id, body.userId);
        return finish(result);
      }
      case "recording-start": {
        await rateLimit(request, id, "recordingControl", RATE_LIMITS.recordingControl);
        const result = await startLiveRoomRecording(id);
        return finish(result);
      }
      case "recording-stop": {
        await rateLimit(request, id, "recordingControl", RATE_LIMITS.recordingControl);
        const result = await stopLiveRoomRecording(id);
        return finish(result);
      }
      case "recording-finalize": {
        await rateLimit(request, id, "recordingControl", RATE_LIMITS.recordingControl);
        const body = recordingFinalizeBody.parse(rawBody);
        const result = await finalizeLiveRecording(
          id,
          body.failed,
          body.recordingAttemptId,
        );
        return finish(result);
      }
    }

    function finish(payload: unknown) {
      logLiveEvent({
        requestId,
        route: "POST /sessions/[id]",
        action,
        sessionId: id,
        status: 200,
        latencyMs: Date.now() - start,
      });
      const resource = action === "send-message" ? "messages" : "state";
      void broadcastLiveRoomInvalidation(id, resource);
      return NextResponse.json(payload);
    }
  } catch (error) {
    const response = jsonError(error, requestId);
    logLiveEvent({
      requestId,
      route: "POST /sessions/[id]",
      sessionId: id,
      status: response.status,
      latencyMs: Date.now() - start,
    });
    return response;
  }
}
