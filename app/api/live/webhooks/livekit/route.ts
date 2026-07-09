import { NextResponse } from "next/server";
import { handleLiveKitWebhook } from "@/lib/livekit-webhook";
import { LiveRoomError } from "@/lib/live-room-server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const authHeader = request.headers.get("authorization");
    const result = await handleLiveKitWebhook(body, authHeader);
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof LiveRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("LIVEKIT_WEBHOOK_ERROR", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
