import { NextResponse } from "next/server";
import { LiveRoomError, rejectLiveRoomWaitingUser } from "@/lib/live-room-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await context.params;
    const room = await rejectLiveRoomWaitingUser(id, userId);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_REJECT_ERROR", error);
  return NextResponse.json({ error: "Failed to reject waiting user." }, { status: 500 });
}
