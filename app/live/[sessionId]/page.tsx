"use client";

import { use, useCallback, useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Circle, Radio, X } from "lucide-react";
import type { TileParticipant } from "@/components/live-class/VideoTile";
import ChatPanel, { type ChatEntry } from "@/components/live-class/ChatPanel";
import ParticipantsPanel from "@/components/live-class/ParticipantsPanel";
import ControlBar from "@/components/live-class/ControlBar";
import SettingsPanel from "@/components/live-class/SettingsPanel";
import WaitingRoomPanel, { type WaitingUser } from "@/components/live-class/WaitingRoomPanel";
import ScreenShareModal, { type ScreenShareSource } from "@/components/live-class/ScreenShareModal";
import LeaveConfirmModal from "@/components/live-class/LeaveConfirmModal";
import ConfirmModal from "@/components/live-class/ConfirmModal";
import LiveKitMediaStage from "@/components/live-class/LiveKitMediaStage";
import type { LiveRoomPayload } from "@/lib/live-room-types";

const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉"];

function mapParticipants(room: LiveRoomPayload | null): TileParticipant[] {
  if (!room) return [];

  return room.participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    role: participant.role,
    micOn: participant.micOn,
    cameraOn: participant.cameraOn,
    handRaised: participant.handRaised,
    isSelf: participant.id === room.currentUser.id,
  }));
}

function mapMessages(room: LiveRoomPayload | null): ChatEntry[] {
  if (!room) return [];

  return room.messages.map((message) => ({
    id: message.id,
    senderName: message.senderName,
    message: message.message,
    isPrivate: message.isPrivate,
    toName: message.toName ?? undefined,
    sentAt: new Date(message.sentAt),
    isSelf: message.senderId === room.currentUser.id,
  }));
}

export default function LiveClassroomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const [room, setRoom] = useState<LiveRoomPayload | null>(null);
  const [participants, setParticipants] = useState<TileParticipant[]>([]);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
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
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showStopRecordingModal, setShowStopRecordingModal] = useState(false);
  const [screenShareSource, setScreenShareSource] = useState<ScreenShareSource | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: number; emoji: string }[]
  >([]);
  const [forceLeaveReason, setForceLeaveReason] = useState<
    "removed" | "ended" | "left" | null
  >(null);

  const applyRoomState = useCallback((nextRoom: LiveRoomPayload) => {
    setRoom(nextRoom);
    setParticipants(mapParticipants(nextRoom));
    setMessages(mapMessages(nextRoom));
    setWaitingUsers(nextRoom.waitingUsers);
    setError(null);
    setErrorStatus(null);

    if (nextRoom.isSessionClosed) {
      setForceLeaveReason("ended");
      setEnded(true);
      return;
    }

    if (nextRoom.isRemoved) {
      setForceLeaveReason("removed");
      // Keep room interactive enough to poll for host re-admit.
      setEnded(false);
      return;
    }

    // Cleared remove / waiting / active again.
    setForceLeaveReason((prev) => (prev === "removed" ? null : prev));
  }, []);

  const loadRoom = useCallback(
    async (mode: "join" | "get" = "get") => {
      if (mode === "join") setLoading(true);

      try {
        const res = await fetch(
          mode === "join"
            ? `/api/live/sessions/${sessionId}/join`
            : `/api/live/sessions/${sessionId}`,
          { method: mode === "join" ? "POST" : "GET" },
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to load live room.");
          setErrorStatus(res.status);
          return;
        }

        applyRoomState(data as LiveRoomPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load live room.");
        setErrorStatus(500);
      } finally {
        if (mode === "join") setLoading(false);
      }
    },
    [applyRoomState, sessionId],
  );

  useEffect(() => {
    void loadRoom("join");
  }, [loadRoom]);

  useEffect(() => {
    // Poll while in room, waiting, or removed (so re-admit is noticed).
    // Stop after voluntary leave or session end.
    if (!room) return;
    if (forceLeaveReason === "left" || forceLeaveReason === "ended") return;
    if (ended && forceLeaveReason !== "removed") return;

    const intervalMs = room.isWaiting || room.isRemoved ? 4000 : 6000;
    const intervalId = window.setInterval(() => {
      void loadRoom("get");
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [ended, forceLeaveReason, loadRoom, room]);

  const currentUser = room?.currentUser;
  const isHost = room?.isHost ?? false;
  const mediaEnabled = Boolean(
    room &&
      !room.isWaiting &&
      !room.isRejected &&
      !room.isRemoved &&
      !room.isSessionClosed &&
      !ended,
  );

  const screenShareLabel =
    screenShareSource === "ENTIRE_SCREEN"
      ? t("liveClassroom.screenShareLabel.entireScreen")
      : screenShareSource === "WINDOW"
        ? t("liveClassroom.screenShareLabel.window")
        : screenShareSource === "TAB"
          ? t("liveClassroom.screenShareLabel.tab")
          : undefined;

  useEffect(() => {
    if (!currentUser?.id) return;

    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === currentUser.id
          ? {
              ...participant,
              micOn,
              cameraOn,
              handRaised,
              isScreenSharing: screenSharing,
              screenShareLabel,
            }
          : participant,
      ),
    );
  }, [cameraOn, currentUser?.id, handRaised, micOn, screenShareLabel, screenSharing]);

  async function sendMessage(message: string, toName?: string) {
    const toUserId =
      room?.participants.find((participant) => participant.name === toName)?.id ?? undefined;

    try {
      const res = await fetch(`/api/live/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, toUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message.");
      }

      applyRoomState(data as LiveRoomPayload);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message.");
    }
  }

  async function hostParticipantAction(
    userId: string,
    action: "admit" | "reject" | "remove",
  ) {
    try {
      const res = await fetch(
        `/api/live/sessions/${sessionId}/participants/${userId}/${action}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to ${action} participant.`);
      }
      applyRoomState(data as LiveRoomPayload);
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} participant.`);
    }
  }

  function fireReaction(emoji: string) {
    const id = Date.now() + Math.random();
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((reaction) => reaction.id !== id));
    }, 1800);
  }

  function handleApprove(id: string) {
    void hostParticipantAction(id, "admit");
  }

  function handleReject(id: string) {
    void hostParticipantAction(id, "reject");
  }

  function handleMute(id: string) {
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id ? { ...participant, micOn: false } : participant,
      ),
    );
  }

  function handleRemove(id: string) {
    void hostParticipantAction(id, "remove");
  }

  function handleMakeCoHost(id: string) {
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id ? { ...participant, role: "CO_HOST" } : participant,
      ),
    );
  }

  function handleLowerHand(id: string) {
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id ? { ...participant, handRaised: false } : participant,
      ),
    );
  }

  function handleMuteAll() {
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.role === "HOST" ? participant : { ...participant, micOn: false },
      ),
    );
  }

  function handleScreenShareToggle() {
    if (screenSharing) {
      setScreenSharing(false);
      setScreenShareSource(null);
      return;
    }
    setShowScreenShareModal(true);
  }

  async function handleConfirmShare(source: ScreenShareSource) {
    setShowScreenShareModal(false);

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        return;
      }
    }

    setScreenShareSource(source);
    setScreenSharing(true);
  }

  function handleLeaveClick() {
    setShowLeaveModal(true);
  }

  async function handleConfirmLeave() {
    setShowLeaveModal(false);

    try {
      if (isHost) {
        const res = await fetch(`/api/live/sessions/${sessionId}/end`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to end live room.");
        setForceLeaveReason("ended");
      } else {
        const res = await fetch(`/api/live/sessions/${sessionId}/leave`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to leave live room.");
        setForceLeaveReason("left");
      }

      setEnded(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to leave live room.");
    }
  }

  function handleToggleRecording() {
    if (isRecording) {
      setShowStopRecordingModal(true);
      return;
    }
    setIsRecording(true);
  }

  function handleConfirmStopRecording() {
    setShowStopRecordingModal(false);
    setIsRecording(false);
  }

  if (errorStatus === 404) {
    notFound();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="text-sm text-white/70">Loading live classroom...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="text-sm text-red-300">{error ?? "Failed to load live classroom."}</div>
      </div>
    );
  }

  if (room.isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Join request declined</h1>
          <p className="text-white/70 text-sm">
            The host declined your request to join this live class.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (room.isSessionClosed || (ended && forceLeaveReason === "ended")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">{t("liveClassroom.meetingEnded")}</h1>
          <p className="text-white/70 text-sm">
            This live session is closed. You cannot rejoin it.
          </p>
          <Link
            href={isHost ? "/instructor/dashboard" : "/dashboard"}
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            {t("liveClassroom.returnToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  if (room.isRemoved || forceLeaveReason === "removed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Removed from class</h1>
          <p className="text-white/70 text-sm">
            The host removed you from this live classroom. If they admit you again,
            you will rejoin automatically.
          </p>
          <p className="text-xs text-white/40">Waiting for host…</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (room.isWaiting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Waiting for host</h1>
          <p className="text-white/70 text-sm">
            You are in the waiting room for{" "}
            <span className="text-white font-medium">{room.liveClass.title}</span>.
            The host will admit you shortly.
          </p>
          <p className="text-xs text-white/40">Checking status automatically…</p>
          <button
            type="button"
            onClick={() => void loadRoom("get")}
            className="inline-block px-6 py-2.5 border border-white/20 rounded-lg font-semibold text-sm hover:bg-white/10"
          >
            Refresh status
          </button>
        </div>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {isHost ? t("liveClassroom.meetingEnded") : t("liveClassroom.youLeftMeeting")}
          </h1>
          <Link
            href={isHost ? "/instructor/dashboard" : "/dashboard"}
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            {t("liveClassroom.returnToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  const sidePanelOpen = chatOpen || participantsOpen;

  return (
    <div className="h-dvh flex flex-col bg-neutral-950 text-white relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-white/10 shrink-0"
            aria-label={t("liveClassroom.back")}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-semibold truncate text-sm sm:text-base">{room.liveClass.title}</h1>
            <p className="text-[11px] sm:text-xs text-white/50 truncate">
              {room.liveClass.courseTitle} · {room.liveClass.batchName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-red-400 bg-red-500/10 rounded-full px-2 sm:px-2.5 py-1">
            <Radio className="w-3 h-3" />
            {room.session.status === "LIVE"
              ? t("liveClassroom.live")
              : t(`liveClass.status.${room.session.status}`)}
            {isRecording && (
              <span className="flex items-center gap-1 pl-1.5 ml-1 border-l border-red-400/30">
                <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                <span className="hidden sm:inline">{t("liveClassroom.rec")}</span>
              </span>
            )}
          </span>
          {isHost && (
            <label className="hidden md:flex items-center gap-1.5 text-xs text-white/70">
              <input
                type="checkbox"
                checked={meetingLocked}
                onChange={(e) => setMeetingLocked(e.target.checked)}
              />
              {t("liveClassroom.lockMeeting")}
            </label>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        <div
          className={`flex-1 min-w-0 p-2 sm:p-4 overflow-y-auto ${sidePanelOpen ? "hidden lg:block" : ""}`}
        >
          <LiveKitMediaStage
            sessionId={sessionId}
            participants={participants}
            micOn={micOn}
            cameraOn={cameraOn}
            enabled={mediaEnabled}
            onForceLeave={(reason) => {
              if (reason === "disconnected" && !ended) {
                // Likely host end/kick; refresh room state instead of immediate blank leave.
                void loadRoom("get");
              }
            }}
          />
        </div>

        {chatOpen && (
          <div className="absolute inset-0 lg:static lg:inset-auto w-full lg:w-80 shrink-0 lg:border-l border-white/10 text-card-foreground bg-card flex flex-col z-20">
            <div className="px-4 py-3 border-b border-border font-semibold text-sm flex items-center justify-between">
              {t("liveClassroom.chat.title")}
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-md hover:bg-muted lg:hidden"
                aria-label={t("liveClassroom.chat.close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatPanel
                messages={messages}
                participantNames={participants
                  .filter((participant) => participant.id !== currentUser?.id)
                  .map((participant) => participant.name)}
                onSend={sendMessage}
              />
            </div>
          </div>
        )}

        {participantsOpen && (
          <div className="absolute inset-0 lg:static lg:inset-auto w-full lg:w-80 shrink-0 lg:border-l border-white/10 bg-card text-card-foreground flex flex-col z-20">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm">{t("liveClassroom.participants.title")}</span>
              <div className="flex items-center gap-3">
                {isHost && (
                  <button
                    onClick={handleMuteAll}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {t("liveClassroom.participants.muteAll")}
                  </button>
                )}
                <button
                  onClick={() => setParticipantsOpen(false)}
                  className="p-1 rounded-md hover:bg-muted lg:hidden"
                  aria-label={t("liveClassroom.participants.close")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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

      {!sidePanelOpen && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 sm:bottom-24 flex items-end justify-between px-3 sm:px-4 z-10">
          <div className="flex items-center gap-2">
            {floatingReactions.map((reaction) => (
              <span
                key={reaction.id}
                className="text-2xl sm:text-3xl animate-bounce"
                style={{ animationDuration: "1.6s" }}
              >
                {reaction.emoji}
              </span>
            ))}
          </div>

          <div className="pointer-events-auto flex flex-col gap-1.5 sm:gap-2">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => fireReaction(emoji)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-base sm:text-lg flex items-center justify-center transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {isHost && !sidePanelOpen && (
        <WaitingRoomPanel
          waitingUsers={waitingUsers}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <div className="shrink-0">
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
          onToggleMic={() => setMicOn((value) => !value)}
          onToggleCamera={() => setCameraOn((value) => !value)}
          onToggleScreenShare={handleScreenShareToggle}
          onToggleHand={() => setHandRaised((value) => !value)}
          onToggleChat={() => setChatOpen((value) => !value)}
          onToggleParticipants={() => setParticipantsOpen((value) => !value)}
          onToggleRecording={handleToggleRecording}
          onToggleCaptions={() => setCaptionsOn((value) => !value)}
          onOpenSettings={() => setSettingsOpen(true)}
          onLeave={handleLeaveClick}
          onEndForAll={handleLeaveClick}
        />
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {showScreenShareModal && (
        <ScreenShareModal
          onCancel={() => setShowScreenShareModal(false)}
          onShare={handleConfirmShare}
        />
      )}

      {showLeaveModal && (
        <LeaveConfirmModal
          isHost={isHost}
          onCancel={() => setShowLeaveModal(false)}
          onConfirm={handleConfirmLeave}
        />
      )}

      {showStopRecordingModal && (
        <ConfirmModal
          icon={Circle}
          title={t("liveClassroom.stopRecording.title")}
          description={t("liveClassroom.stopRecording.description")}
          confirmLabel={t("liveClassroom.stopRecording.confirm")}
          cancelLabel={t("liveClassroom.stopRecording.cancel")}
          onCancel={() => setShowStopRecordingModal(false)}
          onConfirm={handleConfirmStopRecording}
        />
      )}
    </div>
  );
}
