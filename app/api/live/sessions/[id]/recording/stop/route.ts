import { NextResponse } from "next/server";
import { LiveRoomError, stopLiveRoomRecording } from "@/lib/live-room-server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const room = await stopLiveRoomRecording(id);
    return NextResponse.json(room);
  } catch (error) {
    if (error instanceof LiveRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("LIVE_RECORDING_STOP_ERROR", error);
    return NextResponse.json({ error: "Failed to stop recording." }, { status: 500 });
  }
}
