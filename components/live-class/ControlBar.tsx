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
  Captions,
} from "lucide-react";

interface ControlBarProps {
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  isHost: boolean;
  isRecording: boolean;
  captionsOn: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleRecording: () => void;
  onToggleCaptions: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
}

function ControlButton({
  active,
  danger,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  danger?: boolean;
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
        <span className="hidden sm:block absolute bottom-full mb-2 whitespace-nowrap rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg border border-white/10 pointer-events-none z-10">
          {label}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
        </span>
      )}
      <button
        onClick={onClick}
        aria-label={label}
        className={`flex flex-col items-center justify-center gap-1 w-11 h-11 sm:w-14 sm:h-14 rounded-xl transition-colors text-xs ${
          danger
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
  captionsOn,
  chatOpen,
  participantsOpen,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHand,
  onToggleChat,
  onToggleParticipants,
  onToggleRecording,
  onToggleCaptions,
  onOpenSettings,
  onLeave,
  onEndForAll,
}: ControlBarProps) {
  const t = useTranslations("liveClassroom.controls");

  return (
    <div className="shrink-0 border-t border-white/10 pb-[max(env(safe-area-inset-bottom),0.25rem)]">
      <div className="overflow-x-auto">
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap min-w-max bg-neutral-900 px-2 sm:px-4 py-2 sm:py-3">
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
        onClick={onToggleScreenShare}
        label={screenSharing ? t("stopSharingScreen") : t("shareScreen")}
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

      <ControlButton
        active={captionsOn}
        onClick={onToggleCaptions}
        label={captionsOn ? t("turnOffCaptions") : t("turnOnCaptions")}
      >
        <Captions className="w-4 h-4 sm:w-5 sm:h-5" />
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
