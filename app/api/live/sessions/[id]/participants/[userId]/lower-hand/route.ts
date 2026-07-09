import { NextResponse } from "next/server";
import { LiveRoomError, lowerLiveRoomParticipantHand } from "@/lib/live-room-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await context.params;
    const room = await lowerLiveRoomParticipantHand(id, userId);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_LOWER_HAND_ERROR", error);
  return NextResponse.json({ error: "Failed to lower participant hand." }, { status: 500 });
}
