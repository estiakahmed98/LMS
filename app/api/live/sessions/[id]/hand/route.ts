import { NextResponse } from "next/server";
import { LiveRoomError, setLiveRoomHandRaised } from "@/lib/live-room-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { raised?: boolean };
    if (typeof body.raised !== "boolean") {
      return NextResponse.json({ error: "raised must be a boolean." }, { status: 400 });
    }

    const room = await setLiveRoomHandRaised(id, body.raised);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_HAND_ERROR", error);
  return NextResponse.json({ error: "Failed to update hand raise state." }, { status: 500 });
}
