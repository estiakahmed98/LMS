"use client";

import { MicOff, Hand } from "lucide-react";
import { getInitials } from "@/lib/auth";

export interface TileParticipant {
  id: string;
  name: string;
  role: "HOST" | "CO_HOST" | "PARTICIPANT";
  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  speaking?: boolean;
}

export default function VideoTile({
  participant,
  compact = false,
}: {
  participant: TileParticipant;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center ${
        participant.speaking ? "ring-2 ring-primary" : ""
      } ${compact ? "aspect-video" : "aspect-video"}`}
    >
      {participant.cameraOn ? (
        <div className="w-full h-full bg-linear-to-br from-neutral-700 to-neutral-900 flex items-center justify-center">
          <span className="text-neutral-500 text-xs">
            {participant.name}&apos;s camera
          </span>
        </div>
      ) : (
        <div className="w-14 h-14 rounded-full bg-primary/80 text-white flex items-center justify-center text-lg font-semibold">
          {getInitials(participant.name)}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-md px-2 py-1">
        {!participant.micOn && <MicOff className="w-3.5 h-3.5 text-red-400" />}
        <span className="text-xs text-white font-medium">{participant.name}</span>
        {(participant.role === "HOST" || participant.role === "CO_HOST") && (
          <span className="text-[10px] uppercase tracking-wide text-primary-foreground bg-primary/80 rounded px-1">
            {participant.role === "HOST" ? "Host" : "Co-host"}
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
