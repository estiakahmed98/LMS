"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { MicOff, Hand, ScreenShare } from "lucide-react";
import { getInitials } from "@/lib/auth";

export interface TileParticipant {
  id: string;
  name: string;
  role: "HOST" | "CO_HOST" | "PARTICIPANT";
  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  speaking?: boolean;
  isScreenSharing?: boolean;
  screenShareLabel?: string;
  isSelf?: boolean;
}

export default function VideoTile({
  participant,
  compact = false,
  videoStream,
  cameraError,
}: {
  participant: TileParticipant;
  compact?: boolean;
  videoStream?: MediaStream | null;
  cameraError?: string | null;
}) {
  const t = useTranslations("liveClassroom");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = videoStream ?? null;
  }, [videoStream]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center ${
        participant.speaking ? "ring-2 ring-primary" : ""
      } ${participant.isScreenSharing ? "ring-2 ring-green-500" : ""} ${compact ? "aspect-video" : "aspect-video"}`}
    >
      {participant.isScreenSharing ? (
        <div className="w-full h-full bg-linear-to-br from-neutral-800 to-neutral-950 flex flex-col items-center justify-center gap-2">
          <ScreenShare className="w-8 h-8 text-green-400" />
          <span className="text-neutral-400 text-xs">
            {t("isSharing", { name: participant.name })}{" "}
            {participant.screenShareLabel ?? t("screenShareLabel.entireScreen")}
          </span>
        </div>
      ) : participant.cameraOn ? (
        videoStream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover bg-neutral-900 ${
              participant.isSelf ? "scale-x-[-1]" : ""
            }`}
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-neutral-700 to-neutral-900 flex flex-col items-center justify-center gap-1 px-3 text-center">
            <span className="text-neutral-500 text-xs">
              {cameraError ?? t("cameraOf", { name: participant.name })}
            </span>
          </div>
        )
      ) : (
        <div className="w-14 h-14 rounded-full bg-primary/80 text-white flex items-center justify-center text-lg font-semibold">
          {getInitials(participant.name)}
        </div>
      )}

      {participant.isScreenSharing && (
        <span className="absolute top-2 left-2 flex items-center gap-1 bg-green-600 text-white text-[10px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5">
          <ScreenShare className="w-3 h-3" />
          {t("presenting")}
        </span>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-md px-2 py-1">
        {!participant.micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
        <span className="text-xs text-white font-medium">
          {participant.name}
          {participant.isSelf ? ` (${t("you")})` : ""}
        </span>
        {(participant.role === "HOST" || participant.role === "CO_HOST") && (
          <span className="text-[10px] uppercase tracking-wide text-primary-foreground bg-primary/80 rounded px-1">
            {participant.role === "HOST" ? t("participants.host") : t("participants.coHost")}
          </span>
        )}
      </div>

      {participant.handRaised && (
        <div className="absolute top-2 right-2 bg-amber-400 text-black rounded-full p-1.5">
          <Hand className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}
