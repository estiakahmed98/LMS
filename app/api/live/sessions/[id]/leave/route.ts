import { NextResponse } from "next/server";
import { leaveLiveRoom, LiveRoomError } from "@/lib/live-room-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await leaveLiveRoom(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_LEAVE_ERROR", error);
  return NextResponse.json({ error: "Failed to leave live room." }, { status: 500 });
}
