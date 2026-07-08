import { NextResponse } from "next/server";
import { endLiveRoom, LiveRoomError } from "@/lib/live-room-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const room = await endLiveRoom(id);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_END_ERROR", error);
  return NextResponse.json({ error: "Failed to end live room." }, { status: 500 });
}
