import { NextResponse } from "next/server";
import { LiveRoomError } from "@/lib/live-room-server";
import { createLiveKitToken } from "@/lib/livekit-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = await createLiveKitToken(id);
    return NextResponse.json(payload);
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVEKIT_TOKEN_ERROR", error);
  return NextResponse.json(
    { error: "Failed to create LiveKit token." },
    { status: 500 },
  );
}
