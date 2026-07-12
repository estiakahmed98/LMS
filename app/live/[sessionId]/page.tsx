//app/live/[sessionId]/page.tsx
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Circle,
  LayoutGrid,
  Maximize,
  Minimize,
  PictureInPicture2,
  Presentation,
  Radio,
  X,
} from "lucide-react";
import type { TileParticipant } from "@/components/live-class/VideoTile";
import ChatPanel, { type ChatEntry } from "@/components/live-class/ChatPanel";
import ParticipantsPanel from "@/components/live-class/ParticipantsPanel";
import ControlBar from "@/components/live-class/ControlBar";
import SettingsPanel, {
  type MediaDeviceSelection,
} from "@/components/live-class/SettingsPanel";
import WaitingRoomPanel, {
  type WaitingUser,
} from "@/components/live-class/WaitingRoomPanel";
import ScreenShareModal, {
  type ScreenShareSource,
} from "@/components/live-class/ScreenShareModal";
import LeaveConfirmModal from "@/components/live-class/LeaveConfirmModal";
import ConfirmModal from "@/components/live-class/ConfirmModal";
import LiveKitMediaStage, {
  canParticipantShare,
  type LiveConnectionState,
  type LiveSharePolicy,
  type LiveViewMode,
} from "@/components/live-class/LiveKitMediaStage";
import {
  VIDEO_BACKGROUNDS,
  type VideoBackground,
} from "@/lib/virtual-backgrounds";
import type { LiveRoomPayload } from "@/lib/live-room-types";
import { parseApiJson } from "@/lib/parse-api-json";
import type { LiveHostCommand } from "@/lib/livekit-signaling";

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
  const [handRaiseSyncSeq, setHandRaiseSyncSeq] = useState(0);
  // Bumped on every explicit local hand action; any in-flight response
  // (poll or the action's own request) stamped with an older seq is
  // discarded so it can't stomp a newer optimistic value and cause flicker.
  const handActionSeq = useRef(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [showScreenShareModal, setShowScreenShareModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showStopRecordingModal, setShowStopRecordingModal] = useState(false);
  const [screenShareSource, setScreenShareSource] =
    useState<ScreenShareSource | null>(null);
  const [screenShareRequest, setScreenShareRequest] = useState<number | null>(
    null,
  );
  const [hostCommand, setHostCommand] = useState<LiveHostCommand | null>(null);
  const [hostCommandSeq, setHostCommandSeq] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: number; emoji: string }[]
  >([]);
  const [forceLeaveReason, setForceLeaveReason] = useState<
    "removed" | "ended" | "left" | null
  >(null);
  const [connectionState, setConnectionState] =
    useState<LiveConnectionState>("connected");
  const [mediaDevices, setMediaDevices] = useState<MediaDeviceSelection>({
    audioInputId: "",
    videoInputId: "",
    audioOutputId: "",
  });
  const [videoBackground, setVideoBackground] =
    useState<VideoBackground>("none");
  const [blurStrength, setBlurStrength] = useState(15);
  const [viewMode, setViewMode] = useState<LiveViewMode>("speaker");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [spotlightIds, setSpotlightIds] = useState<string[]>([]);
  // Zoom-style default: only the host may share until they open it up.
  const [sharePolicy, setSharePolicy] = useState<LiveSharePolicy>({
    everyone: false,
    allowed: [],
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageAreaRef = useRef<HTMLDivElement>(null);
  const autoMuteApplied = useRef(false);

  // Restore the last-used virtual background (like Zoom/Meet remembers it).
  useEffect(() => {
    const saved = window.localStorage.getItem("live-video-background");
    if (saved && (VIDEO_BACKGROUNDS as string[]).includes(saved)) {
      setVideoBackground(saved as VideoBackground);
    }
    const savedBlur = window.localStorage.getItem("live-blur-strength");
    if (savedBlur) {
      const parsed = Number(savedBlur);
      if (Number.isFinite(parsed) && parsed >= 4 && parsed <= 30) {
        setBlurStrength(parsed);
      }
    }
  }, []);

  function handleVideoBackgroundChange(next: VideoBackground) {
    setVideoBackground(next);
    window.localStorage.setItem("live-video-background", next);
  }

  function handleBlurStrengthChange(next: number) {
    setBlurStrength(next);
    window.localStorage.setItem("live-blur-strength", String(next));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setChatOpen(false);
    }
  }, []);

  const applyRoomState = useCallback((nextRoom: LiveRoomPayload) => {
    setRoom(nextRoom);
    // Preserve ephemeral A/V state across HTTP polls (server does not track mic/camera).
    setParticipants((prev) => {
      const next = mapParticipants(nextRoom);
      const prevById = new Map(prev.map((p) => [p.id, p]));
      return next.map((participant) => {
        const old = prevById.get(participant.id);
        if (!old) return participant;
        return {
          ...participant,
          micOn: old.micOn,
          cameraOn: old.cameraOn,
          isScreenSharing: old.isScreenSharing,
          screenShareLabel: old.screenShareLabel,
        };
      });
    });
    const selfHand = nextRoom.participants.find(
      (participant) => participant.isSelf,
    )?.handRaised;
    // Skip if a newer local hand action started after this response's
    // snapshot was requested — otherwise a slow/late poll can overwrite a
    // more recent optimistic value and the hand visibly blinks.
    if (typeof selfHand === "boolean" && handActionSeq.current === 0) {
      setHandRaised(selfHand);
    }
    setMessages(mapMessages(nextRoom));
    setWaitingUsers(nextRoom.waitingUsers);
    setIsRecording(nextRoom.session.isRecording);
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
        const res = await fetch(`/api/live/sessions/${sessionId}`, {
          method: mode === "join" ? "POST" : "GET",
          ...(mode === "join"
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "join" }),
              }
            : {}),
        });
        const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);

        if (!res.ok) {
          setError(
            "error" in data && data.error
              ? data.error
              : "Failed to load live room.",
          );
          setErrorStatus(res.status);
          return;
        }

        applyRoomState(data as LiveRoomPayload);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load live room.",
        );
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

    const intervalMs = room.isWaiting || room.isRemoved ? 4000 : 3000;
    const intervalId = window.setInterval(() => {
      void loadRoom("get");
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [ended, forceLeaveReason, loadRoom, room]);

  const currentUser = room?.currentUser;
  const isHost = room?.isHost ?? false;

  // Auto-mute on join: participants enter muted (host stays unmuted).
  useEffect(() => {
    if (!room || autoMuteApplied.current) return;
    autoMuteApplied.current = true;
    if (!room.isHost) setMicOn(false);
  }, [room]);

  // Keep pin / spotlights valid when people leave.
  useEffect(() => {
    if (pinnedId && !participants.some((p) => p.id === pinnedId)) {
      setPinnedId(null);
    }
  }, [participants, pinnedId]);
  useEffect(() => {
    if (!isHost) return;
    setSpotlightIds((prev) => {
      const next = prev.filter((id) => participants.some((p) => p.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [isHost, participants]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const canShareScreen = canParticipantShare(
    sharePolicy,
    currentUser?.id ?? "",
    isHost,
  );

  function handleToggleSpotlight(id: string) {
    if (!isHost) return;
    setSpotlightIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id].slice(-4),
    );
  }

  function handleToggleShareAll() {
    if (!isHost) return;
    setSharePolicy((prev) => ({ ...prev, everyone: !prev.everyone }));
  }

  function handleToggleShareFor(id: string) {
    if (!isHost) return;
    setSharePolicy((prev) => ({
      ...prev,
      allowed: prev.allowed.includes(id)
        ? prev.allowed.filter((item) => item !== id)
        : [...prev.allowed, id],
    }));
  }

  function handleToggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void stageAreaRef.current?.requestFullscreen().catch(() => {
        alert(t("liveClassroom.view.fullscreenUnavailable"));
      });
    }
  }

  async function handleTogglePip() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      const video =
        stageAreaRef.current?.querySelector<HTMLVideoElement>(
          "[data-live-main-stage] video",
        ) ?? stageAreaRef.current?.querySelector("video");
      if (!video) throw new Error("No video to present");
      await video.requestPictureInPicture();
    } catch {
      alert(t("liveClassroom.view.pipUnavailable"));
    }
  }
  // Local-mode recording runs in the host's browser; ENDING means "stop and
  // upload the tail", so only STARTING/ACTIVE keep the recorder running.
  const localRecordingActive = Boolean(
    room &&
    isHost &&
    room.session.recordingMode === "local" &&
    (room.session.recordingStatus === "ACTIVE" ||
      room.session.recordingStatus === "STARTING"),
  );
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
  }, [
    cameraOn,
    currentUser?.id,
    handRaised,
    micOn,
    screenShareLabel,
    screenSharing,
  ]);

  async function sendMessage(message: string, toName?: string) {
    const toUserId =
      room?.participants.find((participant) => participant.name === toName)
        ?.id ?? undefined;

    try {
      const res = await fetch(`/api/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-message", message, toUserId }),
      });
      const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);

      if (!res.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : "Failed to send message.",
        );
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
      const actionMap = {
        admit: "admit-participant",
        reject: "reject-participant",
        remove: "remove-participant",
      } as const;
      const res = await fetch(`/api/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionMap[action], userId }),
      });
      const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : `Failed to ${action} participant.`,
        );
      }
      applyRoomState(data as LiveRoomPayload);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : `Failed to ${action} participant.`,
      );
    }
  }

  function fireReaction(emoji: string) {
    const id = Date.now() + Math.random();
    setFloatingReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setFloatingReactions((prev) =>
        prev.filter((reaction) => reaction.id !== id),
      );
    }, 1800);
  }

  function handleApprove(id: string) {
    void hostParticipantAction(id, "admit");
  }

  function handleReject(id: string) {
    void hostParticipantAction(id, "reject");
  }

  function nextHostCommand(
    command:
      | { kind: "MUTE"; targetId: string }
      | { kind: "MUTE_ALL" }
      | { kind: "LOWER_HAND"; targetId: string },
  ): LiveHostCommand {
    const seq = hostCommandSeq + 1;
    setHostCommandSeq(seq);
    const full = { ...command, seq } as LiveHostCommand;
    setHostCommand(full);
    return full;
  }

  function handleMute(id: string) {
    if (id === currentUser?.id) {
      setMicOn(false);
      return;
    }
    nextHostCommand({ kind: "MUTE", targetId: id });
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id ? { ...participant, micOn: false } : participant,
      ),
    );
  }

  function handleRemove(id: string) {
    void hostParticipantAction(id, "remove");
  }

  async function handleToggleHand(nextRaised?: boolean) {
    const raised = typeof nextRaised === "boolean" ? nextRaised : !handRaised;
    const seq = ++handActionSeq.current;
    setHandRaised(raised);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hand", raised }),
      });
      const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Failed to update hand raise state.",
        );
      }
      // Only the most recent action may clear the guard and apply its
      // server snapshot — an older, slower request must not win.
      if (handActionSeq.current === seq) {
        handActionSeq.current = 0;
        applyRoomState(data as LiveRoomPayload);
      }
      setHandRaiseSyncSeq((prevSeq) => prevSeq + 1);
    } catch (err) {
      if (handActionSeq.current === seq) {
        handActionSeq.current = 0;
        setHandRaised(!raised);
      }
      alert(
        err instanceof Error
          ? err.message
          : "Failed to update hand raise state.",
      );
    }
  }

  function handleLowerHand(id: string) {
    if (id === currentUser?.id) {
      void handleToggleHand(false);
      return;
    }
    nextHostCommand({ kind: "LOWER_HAND", targetId: id });
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === id
          ? { ...participant, handRaised: false }
          : participant,
      ),
    );
    void fetch(`/api/live/sessions/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lower-participant-hand", userId: id }),
    })
      .then(async (res) => {
        const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);
        if (res.ok) applyRoomState(data as LiveRoomPayload);
        else void loadRoom("get");
      })
      .catch(() => {
        void loadRoom("get");
      });
  }

  function handleMuteAll() {
    nextHostCommand({ kind: "MUTE_ALL" });
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.role === "HOST" || participant.isSelf
          ? participant
          : { ...participant, micOn: false },
      ),
    );
  }

  function handleScreenShareToggle() {
    if (screenSharing) {
      setScreenShareRequest(-Date.now());
      setScreenSharing(false);
      setScreenShareSource(null);
      return;
    }
    if (!canShareScreen) return;
    // Most mobile browsers cannot capture the screen — fail with a clear
    // message instead of a cryptic getDisplayMedia error.
    if (typeof navigator.mediaDevices?.getDisplayMedia !== "function") {
      alert(t("liveClassroom.screenShare.unsupported"));
      return;
    }
    setShowScreenShareModal(true);
  }

  function handleConfirmShare(source: ScreenShareSource) {
    setShowScreenShareModal(false);
    setScreenShareSource(source);
    // Positive request seq → LiveKitMediaStage calls setScreenShareEnabled(true).
    setScreenShareRequest(Date.now());
  }

  function handleLeaveClick() {
    setShowLeaveModal(true);
  }

  async function handleConfirmLeave() {
    setShowLeaveModal(false);

    try {
      if (isHost) {
        const res = await fetch(`/api/live/sessions/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "end" }),
        });
        const data = await parseApiJson<{ error?: string }>(res);
        if (!res.ok) {
          throw new Error(
            data.error ?? "Failed to end live room.",
          );
        }
        setForceLeaveReason("ended");
      } else {
        const res = await fetch(`/api/live/sessions/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        });
        const data = await parseApiJson<{ error?: string }>(res);
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to leave live room.");
        }
        setForceLeaveReason("left");
      }

      setEnded(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to leave live room.");
    }
  }

  async function handleToggleRecording() {
    if (!isHost) return;
    if (recordingBusy) return;

    if (isRecording) {
      setShowStopRecordingModal(true);
      return;
    }

    setRecordingBusy(true);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recording-start" }),
      });
      const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : "Failed to start recording.",
        );
      }
      applyRoomState(data as LiveRoomPayload);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start recording.");
    } finally {
      setRecordingBusy(false);
    }
  }

  async function handleConfirmStopRecording() {
    setShowStopRecordingModal(false);
    if (recordingBusy) return;

    setRecordingBusy(true);
    try {
      const res = await fetch(`/api/live/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recording-stop" }),
      });
      const data = await parseApiJson<LiveRoomPayload | { error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : "Failed to stop recording.",
        );
      }
      applyRoomState(data as LiveRoomPayload);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to stop recording.");
    } finally {
      setRecordingBusy(false);
    }
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
        <div className="text-sm text-red-300">
          {error ?? "Failed to load live classroom."}
        </div>
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
          <h1 className="text-2xl font-bold">
            {t("liveClassroom.meetingEnded")}
          </h1>
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
            The host removed you from this live classroom. If they admit you
            again, you will rejoin automatically.
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
            <span className="text-white font-medium">
              {room.liveClass.title}
            </span>
            . The host will admit you shortly.
          </p>
          <p className="text-xs text-white/40">
            Checking status automatically…
          </p>
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
            {isHost
              ? t("liveClassroom.meetingEnded")
              : t("liveClassroom.youLeftMeeting")}
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
            <h1 className="font-semibold truncate text-sm sm:text-base">
              {room.liveClass.title}
            </h1>
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
                <span className="hidden sm:inline">
                  {t("liveClassroom.rec")}
                </span>
              </span>
            )}
          </span>
        </div>
      </div>

      {connectionState === "reconnecting" && (
        <div className="shrink-0 px-3 sm:px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs sm:text-sm text-center">
          {t("liveClassroom.reconnecting")}
        </div>
      )}

      {connectionState === "disconnected" && (
        <div className="shrink-0 px-3 sm:px-4 py-2 bg-red-500/15 border-b border-red-500/30 text-red-200 text-xs sm:text-sm text-center">
          {t("liveClassroom.connectionLost")}
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative">
        <div
          ref={stageAreaRef}
          className={`flex-1 min-w-0 relative bg-neutral-950 ${sidePanelOpen ? "hidden lg:block" : ""}`}
        >
          <div className="absolute inset-0 p-2 sm:p-3 pb-20 sm:pb-24">
          <LiveKitMediaStage
            sessionId={sessionId}
            participants={participants}
            micOn={micOn}
            cameraOn={cameraOn}
            screenShareRequest={screenShareRequest}
            hostCommand={hostCommand}
            handRaised={handRaised}
            handRaiseSyncSeq={handRaiseSyncSeq}
            hostIdentity={room.liveClass.instructorId}
            isHost={isHost}
            viewMode={viewMode}
            pinnedId={pinnedId}
            spotlightIds={spotlightIds}
            sharePolicy={sharePolicy}
            audioInputId={mediaDevices.audioInputId}
            videoInputId={mediaDevices.videoInputId}
            audioOutputId={mediaDevices.audioOutputId}
            videoBackground={videoBackground}
            blurStrength={blurStrength}
            localRecordingActive={localRecordingActive}
            enabled={mediaEnabled}
            onTogglePin={setPinnedId}
            onToggleSpotlight={handleToggleSpotlight}
            onSpotlightSync={(ids) => {
              if (!isHost) setSpotlightIds(ids);
            }}
            onSharePolicySync={(policy) => {
              if (!isHost) setSharePolicy(policy);
            }}
            onLocalRecordingStopped={() => void loadRoom("get")}
            onConnectionStateChange={setConnectionState}
            onScreenShareChange={(sharing) => {
              setScreenSharing(sharing);
              if (!sharing) setScreenShareSource(null);
            }}
            onRemoteMute={() => setMicOn(false)}
            onParticipantsMediaSync={(updates) => {
              setParticipants((prev) =>
                prev.map((participant) => {
                  const update = updates.find(
                    (item) => item.id === participant.id,
                  );
                  if (!update) return participant;
                  return {
                    ...participant,
                    micOn: update.micOn,
                    cameraOn: update.cameraOn,
                    isScreenSharing: update.isScreenSharing,
                  };
                }),
              );
            }}
            onHandStateSync={(hands) => {
              // Remote participants only — self hand state is owned by this
              // page's own action/poll flow (see handActionSeq) and must
              // never be overwritten by the bridge's echo of its own prop,
              // otherwise the two channels fight and the icon blinks.
              setParticipants((prev) =>
                prev.map((participant) =>
                  participant.id !== currentUser?.id &&
                  hands[participant.id] !== undefined
                    ? { ...participant, handRaised: hands[participant.id]! }
                    : participant,
                ),
              );
            }}
            onForceLeave={(reason) => {
              if (reason === "disconnected" && !ended) {
                void loadRoom("get");
              }
            }}
          />
          </div>

          {isRecording && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-xs font-semibold text-white pointer-events-none">
              <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500 animate-pulse" />
              {t("liveClassroom.view.recording")}
            </div>
          )}

          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setViewMode((mode) =>
                  mode === "speaker" ? "gallery" : "speaker",
                )
              }
              className="flex items-center gap-1.5 rounded-lg bg-black/60 hover:bg-black/80 px-2.5 py-1.5 text-xs font-semibold text-white"
              aria-label={
                viewMode === "speaker"
                  ? t("liveClassroom.view.gallery")
                  : t("liveClassroom.view.speaker")
              }
            >
              {viewMode === "speaker" ? (
                <LayoutGrid className="w-3.5 h-3.5" />
              ) : (
                <Presentation className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {viewMode === "speaker"
                  ? t("liveClassroom.view.gallery")
                  : t("liveClassroom.view.speaker")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handleTogglePip()}
              className="rounded-lg bg-black/60 hover:bg-black/80 p-1.5 text-white"
              aria-label={t("liveClassroom.view.pip")}
              title={t("liveClassroom.view.pip")}
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="rounded-lg bg-black/60 hover:bg-black/80 p-1.5 text-white"
              aria-label={
                isFullscreen
                  ? t("liveClassroom.view.exitFullscreen")
                  : t("liveClassroom.view.fullscreen")
              }
              title={
                isFullscreen
                  ? t("liveClassroom.view.exitFullscreen")
                  : t("liveClassroom.view.fullscreen")
              }
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20">
            <ControlBar
              micOn={micOn}
              cameraOn={cameraOn}
              screenSharing={screenSharing}
              handRaised={handRaised}
              isHost={isHost}
              isRecording={isRecording}
              chatOpen={chatOpen}
              participantsOpen={participantsOpen}
              canShareScreen={canShareScreen}
              onToggleMic={() => setMicOn((value) => !value)}
              onToggleCamera={() => setCameraOn((value) => !value)}
              onToggleScreenShare={handleScreenShareToggle}
              onToggleHand={() => void handleToggleHand()}
              onToggleChat={() => setChatOpen((value) => !value)}
              onToggleParticipants={() => setParticipantsOpen((value) => !value)}
              onToggleRecording={handleToggleRecording}
              onOpenSettings={() => setSettingsOpen(true)}
              onLeave={handleLeaveClick}
              onEndForAll={handleLeaveClick}
            />
          </div>
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
              <span className="font-semibold text-sm">
                {t("liveClassroom.participants.title")}
              </span>
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
                spotlightIds={spotlightIds}
                sharePolicy={sharePolicy}
                onMuteParticipant={handleMute}
                onRemoveParticipant={handleRemove}
                onLowerHand={handleLowerHand}
                onToggleSpotlight={handleToggleSpotlight}
                onToggleShareAll={handleToggleShareAll}
                onToggleShareFor={handleToggleShareFor}
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

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          devices={mediaDevices}
          onChange={(next) => setMediaDevices((prev) => ({ ...prev, ...next }))}
          videoBackground={videoBackground}
          onVideoBackgroundChange={handleVideoBackgroundChange}
          blurStrength={blurStrength}
          onBlurStrengthChange={handleBlurStrengthChange}
        />
      )}

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
