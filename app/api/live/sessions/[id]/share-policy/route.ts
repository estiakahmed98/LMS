import { NextResponse } from "next/server";
import { updateLiveRoomSharePolicy } from "@/lib/livekit-server";
import { ApiError, getRequestId, jsonError } from "@/lib/api-errors";
import { logLiveEvent } from "@/lib/live-observability";
import { buildRateLimitKey, checkRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { sharePolicyBody, parseJsonBody, sessionIdParam } from "@/lib/live-validation";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const start = Date.now();
  let id = "unknown";

  try {
    const { id: rawId } = await context.params;
    id = sessionIdParam.parse(rawId);
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const ip = getTrustedClientIp(request.headers);
    const globalKey = buildRateLimitKey({
      userId,
      sessionId: "_all",
      action: "liveApiGlobal",
      ip,
    });
    const globalResult = await checkRateLimit(
      "liveApiGlobal",
      RATE_LIMITS.liveApiGlobal,
      globalKey,
    );
    if (!globalResult.allowed) {
      throw new ApiError(
        429,
        globalResult.code,
        "Too many requests. Please wait before trying again.",
        globalResult.retryAfterSeconds,
      );
    }
    const key = buildRateLimitKey({ userId, sessionId: id, action: "hostAction", ip });
    const result = await checkRateLimit("hostAction", RATE_LIMITS.hostAction, key);
    if (!result.allowed) {
      throw new ApiError(
        429,
        result.code,
        "Too many requests. Please wait before trying again.",
        result.retryAfterSeconds,
      );
    }

    const body = await parseJsonBody(request, sharePolicyBody);
    await updateLiveRoomSharePolicy(id, body.policy, body.allowedUserIds);

    logLiveEvent({
      requestId,
      route: "POST /sessions/[id]/share-policy",
      sessionId: id,
      status: 200,
      latencyMs: Date.now() - start,
    });
    return NextResponse.json({
      ok: true,
      policy: body.policy,
      allowedUserIds: body.allowedUserIds,
    });
  } catch (error) {
    const response = jsonError(error, requestId);
    logLiveEvent({
      requestId,
      route: "POST /sessions/[id]/share-policy",
      sessionId: id,
      status: response.status,
      latencyMs: Date.now() - start,
    });
    return response;
  }
}
