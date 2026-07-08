import { NextResponse } from "next/server";
import { admitLiveRoomParticipant, LiveRoomError } from "@/lib/live-room-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await context.params;
    const room = await admitLiveRoomParticipant(id, userId);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_ADMIT_ERROR", error);
  return NextResponse.json({ error: "Failed to admit participant." }, { status: 500 });
}
