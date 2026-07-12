import { NextResponse } from "next/server";
import { createLiveKitToken } from "@/lib/livekit-server";
import {
  appendLiveRecordingChunk,
  finalizeLiveRecording,
} from "@/lib/live-local-recording-server";
import {
  admitLiveRoomParticipant,
  endLiveRoom,
  getLiveRoom,
  joinLiveRoom,
  leaveLiveRoom,
  LiveRoomError,
  lowerLiveRoomParticipantHand,
  rejectLiveRoomWaitingUser,
  removeLiveRoomParticipant,
  sendLiveRoomMessage,
  setLiveRoomHandRaised,
  startLiveRoomRecording,
  stopLiveRoomRecording,
} from "@/lib/live-room-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const resource = new URL(request.url).searchParams.get("resource");

    if (resource === "livekit-token") {
      const payload = await createLiveKitToken(id);
      return NextResponse.json(payload);
    }

    const room = await getLiveRoom(id);
    return NextResponse.json(room);
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const queryAction = url.searchParams.get("action");

    if (queryAction === "recording-chunk") {
      const seq = Number(url.searchParams.get("seq"));
      if (!Number.isInteger(seq) || seq < 0) {
        return NextResponse.json({ error: "Invalid chunk sequence." }, { status: 400 });
      }
      const data = Buffer.from(await request.arrayBuffer());
      await appendLiveRecordingChunk(id, seq, data);
      return NextResponse.json({ ok: true });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      raised?: boolean;
      message?: string;
      toUserId?: string;
      userId?: string;
      failed?: boolean;
    };
    const action = queryAction ?? body.action;

    switch (action) {
      case "join":
        return NextResponse.json(await joinLiveRoom(id));
      case "leave":
        await leaveLiveRoom(id);
        return NextResponse.json({ ok: true });
      case "end":
        return NextResponse.json(await endLiveRoom(id));
      case "hand": {
        if (typeof body.raised !== "boolean") {
          return NextResponse.json({ error: "raised must be a boolean." }, { status: 400 });
        }
        return NextResponse.json(await setLiveRoomHandRaised(id, body.raised));
      }
      case "send-message":
        return NextResponse.json(
          await sendLiveRoomMessage(id, body.message ?? "", body.toUserId),
        );
      case "admit-participant": {
        if (!body.userId) {
          return NextResponse.json({ error: "userId is required." }, { status: 400 });
        }
        return NextResponse.json(await admitLiveRoomParticipant(id, body.userId));
      }
      case "reject-participant": {
        if (!body.userId) {
          return NextResponse.json({ error: "userId is required." }, { status: 400 });
        }
        return NextResponse.json(await rejectLiveRoomWaitingUser(id, body.userId));
      }
      case "remove-participant": {
        if (!body.userId) {
          return NextResponse.json({ error: "userId is required." }, { status: 400 });
        }
        return NextResponse.json(await removeLiveRoomParticipant(id, body.userId));
      }
      case "lower-participant-hand": {
        if (!body.userId) {
          return NextResponse.json({ error: "userId is required." }, { status: 400 });
        }
        return NextResponse.json(await lowerLiveRoomParticipantHand(id, body.userId));
      }
      case "recording-start":
        return NextResponse.json(await startLiveRoomRecording(id));
      case "recording-stop":
        return NextResponse.json(await stopLiveRoomRecording(id));
      case "recording-finalize":
        return NextResponse.json(await finalizeLiveRecording(id, body.failed === true));
      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (error) {
    return handleLiveRoomError(error);
  }
}

function handleLiveRoomError(error: unknown) {
  if (error instanceof LiveRoomError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("LIVE_SESSION_ACTION_ERROR", error);
  return NextResponse.json({ error: "Failed to process live session request." }, { status: 500 });
}
