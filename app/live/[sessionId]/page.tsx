"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Circle, Radio } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getSessionById,
  getLiveClassById,
  getUserById,
  mockEnrollments,
  getCourseById,
} from "@/lib/mock-data";
import VideoTile, { type TileParticipant } from "@/components/live-class/VideoTile";
import ChatPanel, { type ChatEntry } from "@/components/live-class/ChatPanel";
import ParticipantsPanel from "@/components/live-class/ParticipantsPanel";
import ControlBar from "@/components/live-class/ControlBar";
import SettingsPanel from "@/components/live-class/SettingsPanel";
import WaitingRoomPanel, { type WaitingUser } from "@/components/live-class/WaitingRoomPanel";

const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉"];

export default function LiveClassroomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const currentUser = getCurrentUser();

  const session = getSessionById(sessionId);
  if (!session) notFound();

  const liveClass = getLiveClassById(session.liveClassId);
  if (!liveClass) notFound();

  const instructor = getUserById(liveClass.instructorId);
  const course = getCourseById(liveClass.courseId);

  const isHost = currentUser?.id === liveClass.instructorId;
  const enrolledStudentIds = useMemo(
    () =>
      mockEnrollments
        .filter((e) => e.courseId === liveClass.courseId && e.status === "APPROVED")
        .map((e) => e.userId),
    [liveClass.courseId],
  );

  const initialParticipants: TileParticipant[] = useMemo(() => {
    const list: TileParticipant[] = [];
    if (instructor) {
      list.push({
        id: instructor.id,
        name: instructor.name,
        role: "HOST",
        micOn: true,
        cameraOn: true,
        handRaised: false,
        speaking: true,
      });
    }
    enrolledStudentIds.slice(0, 6).forEach((id, index) => {
      const user = getUserById(id);
      if (!user) return;
      list.push({
        id: user.id,
        name: user.name,
        role: "PARTICIPANT",
        micOn: index % 3 !== 0,
        cameraOn: index % 2 === 0,
        handRaised: false,
      });
    });
    return list;
  }, [instructor, enrolledStudentIds]);

  const [participants, setParticipants] = useState<TileParticipant[]>(initialParticipants);
  const [messages, setMessages] = useState<ChatEntry[]>([
    ...(instructor
      ? [
          {
            id: "seed_1",
            senderName: instructor.name,
            message: "Welcome everyone! We'll begin shortly.",
            isPrivate: false,
            sentAt: new Date(Date.now() - 5 * 60000),
          },
        ]
      : []),
  ]);
  const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>(
    liveClass.waitingRoomEnabled
      ? enrolledStudentIds
          .slice(6, 8)
          .map((id) => getUserById(id))
          .filter((u): u is NonNullable<typeof u> => !!u)
          .map((u) => ({ id: u.id, name: u.name }))
      : [],
  );

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [meetingLocked, setMeetingLocked] = useState(false);
  const [ended, setEnded] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: number; emoji: string }[]
  >([]);

  const selfName = currentUser?.name ?? "You";

  function sendMessage(message: string, toName?: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        senderName: selfName,
        message,
        isPrivate: !!toName,
        toName,
        sentAt: new Date(),
        isSelf: true,
      },
    ]);
  }

  function fireReaction(emoji: string) {
    const id = Date.now() + Math.random();
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 1800);
  }

  function handleApprove(id: string) {
    const waiting = waitingUsers.find((w) => w.id === id);
    if (!waiting) return;
    setWaitingUsers((prev) => prev.filter((w) => w.id !== id));
    setParticipants((prev) => [
      ...prev,
      {
        id: waiting.id,
        name: waiting.name,
        role: "PARTICIPANT",
        micOn: false,
        cameraOn: false,
        handRaised: false,
      },
    ]);
  }

  function handleReject(id: string) {
    setWaitingUsers((prev) => prev.filter((w) => w.id !== id));
  }

  function handleMute(id: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, micOn: false } : p)),
    );
  }

  function handleRemove(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function handleMakeCoHost(id: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role: "CO_HOST" } : p)),
    );
  }

  function handleLowerHand(id: string) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, handRaised: false } : p)),
    );
  }

  function handleMuteAll() {
    setParticipants((prev) =>
      prev.map((p) => (p.role === "HOST" ? p : { ...p, micOn: false })),
    );
  }

  if (ended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {isHost ? "Meeting ended" : "You left the meeting"}
          </h1>
          <Link
            href={isHost ? "/instructor/dashboard" : "/dashboard"}
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-950 text-white relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{liveClass.title}</h1>
            <p className="text-xs text-white/50 truncate">
              {course?.title} · {liveClass.batchName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
              <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500 animate-pulse" />
              REC
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 rounded-full px-2.5 py-1">
            <Radio className="w-3 h-3" />
            LIVE
          </span>
          {isHost && (
            <label className="flex items-center gap-1.5 text-xs text-white/70">
              <input
                type="checkbox"
                checked={meetingLocked}
                onChange={(e) => setMeetingLocked(e.target.checked)}
              />
              Lock meeting
            </label>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-w-0 p-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((p) => (
              <VideoTile key={p.id} participant={p} />
            ))}
          </div>
        </div>

        {chatOpen && (
          <div className="w-80 shrink-0 border-l border-white/10 bg-neutral-900/60 text-card-foreground bg-card hidden md:flex flex-col">
            <div className="px-4 py-3 border-b border-border font-semibold text-sm">Chat</div>
            <div className="flex-1 min-h-0">
              <ChatPanel
                messages={messages}
                participantNames={participants
                  .filter((p) => p.id !== currentUser?.id)
                  .map((p) => p.name)}
                onSend={sendMessage}
              />
            </div>
          </div>
        )}

        {participantsOpen && (
          <div className="w-80 shrink-0 border-l border-white/10 bg-card text-card-foreground hidden md:flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">Participants</span>
              {isHost && (
                <button
                  onClick={handleMuteAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Mute all
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <ParticipantsPanel
                participants={participants}
                isHost={isHost}
                onMuteParticipant={handleMute}
                onRemoveParticipant={handleRemove}
                onMakeCoHost={handleMakeCoHost}
                onLowerHand={handleLowerHand}
              />
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
        {floatingReactions.map((r) => (
          <span
            key={r.id}
            className="text-3xl animate-bounce"
            style={{ animationDuration: "1.6s" }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      <div className="absolute bottom-24 right-4 flex flex-col gap-2">
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => fireReaction(emoji)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-lg flex items-center justify-center transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {isHost && (
        <WaitingRoomPanel
          waitingUsers={waitingUsers}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <ControlBar
        micOn={micOn}
        cameraOn={cameraOn}
        screenSharing={screenSharing}
        handRaised={handRaised}
        isHost={isHost}
        isRecording={isRecording}
        captionsOn={captionsOn}
        chatOpen={chatOpen}
        participantsOpen={participantsOpen}
        onToggleMic={() => setMicOn((v) => !v)}
        onToggleCamera={() => setCameraOn((v) => !v)}
        onToggleScreenShare={() => setScreenSharing((v) => !v)}
        onToggleHand={() => setHandRaised((v) => !v)}
        onToggleChat={() => setChatOpen((v) => !v)}
        onToggleParticipants={() => setParticipantsOpen((v) => !v)}
        onToggleRecording={() => setIsRecording((v) => !v)}
        onToggleCaptions={() => setCaptionsOn((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        onLeave={() => setEnded(true)}
        onEndForAll={() => setEnded(true)}
      />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
