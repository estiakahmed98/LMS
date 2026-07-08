import { NextResponse } from "next/server";
import { LiveRoomError, sendLiveRoomMessage } from "@/lib/live-room-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      message?: string;
      toUserId?: string;
    };

    const room = await sendLiveRoomMessage(id, body.message ?? "", body.toUserId);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_ROOM_MESSAGE_ERROR", error);
  return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
}
