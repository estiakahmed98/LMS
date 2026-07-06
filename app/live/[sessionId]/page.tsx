"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Circle, Radio, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getSessionById,
  getLiveClassById,
  getUserById,
  mockEnrollments,
  getCourseById,
} from "@/lib/mock-data";
import VideoTile, {
  type TileParticipant,
} from "@/components/live-class/VideoTile";
import ChatPanel, { type ChatEntry } from "@/components/live-class/ChatPanel";
import ParticipantsPanel from "@/components/live-class/ParticipantsPanel";
import ControlBar from "@/components/live-class/ControlBar";
import SettingsPanel from "@/components/live-class/SettingsPanel";
import WaitingRoomPanel, {
  type WaitingUser,
} from "@/components/live-class/WaitingRoomPanel";
import ScreenShareModal, {
  type ScreenShareSource,
} from "@/components/live-class/ScreenShareModal";
import LeaveConfirmModal from "@/components/live-class/LeaveConfirmModal";
import ConfirmModal from "@/components/live-class/ConfirmModal";
import { useLocalCamera } from "@/lib/use-local-camera";

const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉"];

export default function LiveClassroomPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const serverUser = getCurrentUser();
  const [clientUser, setClientUser] = useState(serverUser);
  const currentUser = mounted ? clientUser : serverUser;

  useEffect(() => {
    setClientUser(getCurrentUser());
    setMounted(true);
  }, []);

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
        .filter(
          (e) => e.courseId === liveClass.courseId && e.status === "APPROVED",
        )
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
        isSelf: instructor.id === currentUser?.id,
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
        isSelf: user.id === currentUser?.id,
      });
    });

    if (currentUser && !list.some((p) => p.id === currentUser.id)) {
      list.push({
        id: currentUser.id,
        name: currentUser.name,
        role: "PARTICIPANT",
        micOn: true,
        cameraOn: true,
        handRaised: false,
        isSelf: true,
      });
    }

    return list;
  }, [instructor, enrolledStudentIds, currentUser]);

  const [participants, setParticipants] =
    useState<TileParticipant[]>(initialParticipants);
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
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showStopRecordingModal, setShowStopRecordingModal] = useState(false);
  const [screenShareSource, setScreenShareSource] = useState<ScreenShareSource | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: number; emoji: string }[]
  >([]);

  const { stream: localCameraStream, error: localCameraError } = useLocalCamera(
    mounted && cameraOn,
  );

  const selfName = currentUser?.name ?? "You";
  const presenter = participants.find((p) => p.isScreenSharing);

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
      prev.map((p) =>
        p.id === currentUser.id
          ? {
              ...p,
              micOn,
              cameraOn,
              handRaised,
              isScreenSharing: screenSharing,
              screenShareLabel,
            }
          : p,
      ),
    );
  }, [micOn, cameraOn, handRaised, screenSharing, screenShareLabel, currentUser?.id]);

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

  function handleConfirmLeave() {
    setShowLeaveModal(false);
    setEnded(true);
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
            <h1 className="font-semibold truncate text-sm sm:text-base">{liveClass.title}</h1>
            <p className="text-[11px] sm:text-xs text-white/50 truncate">
              {course?.title} · {liveClass.batchName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-red-400 bg-red-500/10 rounded-full px-2 sm:px-2.5 py-1">
            <Radio className="w-3 h-3" />
            {t("liveClassroom.live")}
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
          {presenter ? (
            <div className="flex flex-col gap-3 sm:gap-4 h-full">
              <div className="flex-1 min-h-0">
                <VideoTile
                  participant={presenter}
                  videoStream={presenter.isSelf ? localCameraStream : undefined}
                  cameraError={presenter.isSelf ? localCameraError : undefined}
                />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 shrink-0">
                {participants
                  .filter((p) => p.id !== presenter.id)
                  .map((p) => (
                    <VideoTile
                      key={p.id}
                      participant={p}
                      compact
                      videoStream={p.isSelf ? localCameraStream : undefined}
                      cameraError={p.isSelf ? localCameraError : undefined}
                    />
                  ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {participants.map((p) => (
                <VideoTile
                  key={p.id}
                  participant={p}
                  videoStream={p.isSelf ? localCameraStream : undefined}
                  cameraError={p.isSelf ? localCameraError : undefined}
                />
              ))}
            </div>
          )}
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
                  .filter((p) => p.id !== currentUser?.id)
                  .map((p) => p.name)}
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
            {floatingReactions.map((r) => (
              <span
                key={r.id}
                className="text-2xl sm:text-3xl animate-bounce"
                style={{ animationDuration: "1.6s" }}
              >
                {r.emoji}
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
          onToggleMic={() => setMicOn((v) => !v)}
          onToggleCamera={() => setCameraOn((v) => !v)}
          onToggleScreenShare={handleScreenShareToggle}
          onToggleHand={() => setHandRaised((v) => !v)}
          onToggleChat={() => setChatOpen((v) => !v)}
          onToggleParticipants={() => setParticipantsOpen((v) => !v)}
          onToggleRecording={handleToggleRecording}
          onToggleCaptions={() => setCaptionsOn((v) => !v)}
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
