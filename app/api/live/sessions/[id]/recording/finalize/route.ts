import { NextResponse } from "next/server";
import { finalizeLiveRecording } from "@/lib/live-local-recording-server";
import { LiveRoomError } from "@/lib/live-room-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { failed?: boolean };
    const room = await finalizeLiveRecording(id, body.failed === true);
    return NextResponse.json(room);
  } catch (error) {
    if (error instanceof LiveRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("LIVE_RECORDING_FINALIZE_ERROR", error);
    return NextResponse.json({ error: "Failed to finalize recording." }, { status: 500 });
  }
}
