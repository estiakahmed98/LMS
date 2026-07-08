import { NextResponse } from "next/server";
import { getLiveRoom, LiveRoomError } from "@/lib/live-room-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const room = await getLiveRoom(id);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_GET_ERROR", error);
  return NextResponse.json({ error: "Failed to load live room." }, { status: 500 });
}
