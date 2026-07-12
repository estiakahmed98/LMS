"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Hand,
  MessageSquare,
  Users,
  Circle,
  Square,
  PhoneOff,
  Settings,
} from "lucide-react";

interface ControlBarProps {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  isHost: boolean;
  isRecording: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  /** False when the host's share policy blocks this participant. */
  canShareScreen?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleRecording: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
}

function ControlButton({
  active,
  danger,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <span className="hidden sm:block absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg border border-white/10 pointer-events-none z-30">
          {label}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
        </span>
      )}
      <button
        onClick={onClick}
        aria-label={label}
        disabled={disabled}
        className={`flex flex-col items-center justify-center gap-1 w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition-colors text-xs ${
          disabled
            ? "bg-white/5 text-white/25 cursor-not-allowed"
            : danger
              ? "bg-red-600 text-white hover:bg-red-700"
              : active
                ? "bg-white/15 text-white hover:bg-white/25"
                : "bg-white/5 text-white/60 hover:bg-white/15"
        }`}
      >
        {children}
      </button>
    </div>
  );
}

export default function ControlBar({
  micOn,
  cameraOn,
  screenSharing,
  handRaised,
  isHost,
  isRecording,
  chatOpen,
  participantsOpen,
  canShareScreen = true,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHand,
  onToggleChat,
  onToggleParticipants,
  onToggleRecording,
  onOpenSettings,
  onLeave,
  onEndForAll,
}: ControlBarProps) {
  const t = useTranslations("liveClassroom.controls");

  return (
    <div className="pb-[max(env(safe-area-inset-bottom),0.5rem)] px-2">
      {/* overflow-x-auto only on phones (tooltips are hidden there); on
          larger screens overflow stays visible so hover tooltips can extend
          above the bar without spawning a scrollbar that pushes it down. */}
      <div className="overflow-x-auto sm:overflow-visible">
        <div className="mx-auto flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap min-w-max w-fit rounded-2xl bg-neutral-900/90 backdrop-blur border border-white/10 shadow-2xl px-2 sm:px-4 py-2 sm:py-2.5">
      <ControlButton active={micOn} onClick={onToggleMic} label={micOn ? t("muteMic") : t("unmuteMic")}>
        {micOn ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />}
      </ControlButton>

      <ControlButton
        active={cameraOn}
        onClick={onToggleCamera}
        label={cameraOn ? t("stopVideo") : t("startVideo")}
      >
        {cameraOn ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />}
      </ControlButton>

      <ControlButton
        active={screenSharing}
        disabled={!canShareScreen && !screenSharing}
        onClick={onToggleScreenShare}
        label={
          !canShareScreen && !screenSharing
            ? t("shareDisabledByHost")
            : screenSharing
              ? t("stopSharingScreen")
              : t("shareScreen")
        }
      >
        {screenSharing ? (
          <ScreenShareOff className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
        ) : (
          <ScreenShare className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </ControlButton>

      <ControlButton active={handRaised} onClick={onToggleHand} label={handRaised ? t("lowerHand") : t("raiseHand")}>
        <Hand className={`w-4 h-4 sm:w-5 sm:h-5 ${handRaised ? "text-amber-400" : ""}`} />
      </ControlButton>

      <ControlButton active={chatOpen} onClick={onToggleChat} label={chatOpen ? t("closeChat") : t("openChat")}>
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
      </ControlButton>

      <ControlButton
        active={participantsOpen}
        onClick={onToggleParticipants}
        label={participantsOpen ? t("hideParticipants") : t("showParticipants")}
      >
        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
      </ControlButton>

      {isHost && (
        <ControlButton
          active={isRecording}
          onClick={onToggleRecording}
          label={isRecording ? t("stopRecording") : t("startRecording")}
        >
          {isRecording ? (
            <Square className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          ) : (
            <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </ControlButton>
      )}

      <ControlButton onClick={onOpenSettings} label={t("openSettings")}>
        <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
      </ControlButton>

      {isHost ? (
        <ControlButton danger onClick={onEndForAll} label={t("endForAll")}>
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
        </ControlButton>
      ) : (
        <ControlButton danger onClick={onLeave} label={t("leaveMeeting")}>
          <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
        </ControlButton>
      )}
        </div>
      </div>
    </div>
  );
}
