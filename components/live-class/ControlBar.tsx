"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
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
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl transition-colors text-xs ${
        danger
          ? "bg-red-600 text-white hover:bg-red-700"
          : active
            ? "bg-white/15 text-white hover:bg-white/25"
            : "bg-white/5 text-white/60 hover:bg-white/15"
      }`}
    >
      {children}
    </button>
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
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap bg-neutral-900 px-4 py-3">
      <ControlButton active={micOn} onClick={onToggleMic} label={micOn ? "Mute" : "Unmute"}>
        {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-red-400" />}
      </ControlButton>

      <ControlButton
        active={cameraOn}
        onClick={onToggleCamera}
        label={cameraOn ? "Stop video" : "Start video"}
      >
        {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5 text-red-400" />}
      </ControlButton>

      <ControlButton
        active={screenSharing}
        onClick={onToggleScreenShare}
        label="Share screen"
      >
        <ScreenShare className="w-5 h-5" />
      </ControlButton>

      <ControlButton active={handRaised} onClick={onToggleHand} label="Raise hand">
        <Hand className={`w-5 h-5 ${handRaised ? "text-amber-400" : ""}`} />
      </ControlButton>

      <ControlButton active={chatOpen} onClick={onToggleChat} label="Chat">
        <MessageSquare className="w-5 h-5" />
      </ControlButton>

      <ControlButton active={participantsOpen} onClick={onToggleParticipants} label="Participants">
        <Users className="w-5 h-5" />
      </ControlButton>

      <ControlButton active={captionsOn} onClick={onToggleCaptions} label="Live captions">
        <Captions className="w-5 h-5" />
      </ControlButton>

      {isHost && (
        <ControlButton active={isRecording} onClick={onToggleRecording} label="Record">
          {isRecording ? (
            <Square className="w-5 h-5 text-red-400" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </ControlButton>
      )}

      <ControlButton onClick={onOpenSettings} label="Settings">
        <Settings className="w-5 h-5" />
      </ControlButton>

      {isHost ? (
        <ControlButton danger onClick={onEndForAll} label="End for all">
          <PhoneOff className="w-5 h-5" />
        </ControlButton>
      ) : (
        <ControlButton danger onClick={onLeave} label="Leave meeting">
          <PhoneOff className="w-5 h-5" />
        </ControlButton>
      )}
    </div>
  );
}
