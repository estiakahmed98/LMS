import { NextResponse } from "next/server";
import { appendLiveRecordingChunk } from "@/lib/live-local-recording-server";
import { LiveRoomError } from "@/lib/live-room-server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const seq = Number(new URL(request.url).searchParams.get("seq"));
    if (!Number.isInteger(seq) || seq < 0) {
      return NextResponse.json({ error: "Invalid chunk sequence." }, { status: 400 });
    }

    const data = Buffer.from(await request.arrayBuffer());
    await appendLiveRecordingChunk(id, seq, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof LiveRoomError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("LIVE_RECORDING_CHUNK_ERROR", error);
    return NextResponse.json({ error: "Failed to store recording chunk." }, { status: 500 });
  }
}
