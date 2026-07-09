"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  MoreVertical,
  Crown,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { getInitials } from "@/lib/auth";
import type { TileParticipant } from "./VideoTile";

export default function ParticipantsPanel({
  participants,
  isHost,
  onMuteParticipant,
  onRemoveParticipant,
  onLowerHand,
}: {
  participants: TileParticipant[];
  isHost: boolean;
  onMuteParticipant: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
  onLowerHand: (id: string) => void;
}) {
  const t = useTranslations("liveClassroom.participants");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const raisedHands = participants.filter((p) => p.handRaised);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("count", { count: participants.length })}
        </p>
      </div>

      {raisedHands.length > 0 && (
        <div className="p-3 border-b border-border bg-amber-500/5">
          <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
            <Hand className="w-3.5 h-3.5" />
            {t("raisedHands", { count: raisedHands.length })}
          </p>
          <div className="space-y-1.5">
            {raisedHands.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.name}</span>
                {isHost && (
                  <button
                    onClick={() => onLowerHand(p.id)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {t("lowerHand")}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between gap-2 px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {getInitials(participant.name)}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate flex items-center gap-1">
                  {participant.name}
                  {participant.handRaised && (
                    <Hand className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  {participant.role === "HOST" && (
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  {participant.role === "CO_HOST" && (
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {participant.micOn ? (
                <Mic className="w-4 h-4 text-muted-foreground" />
              ) : (
                <MicOff className="w-4 h-4 text-red-500" />
              )}
              {participant.cameraOn ? (
                <Video className="w-4 h-4 text-muted-foreground" />
              ) : (
                <VideoOff className="w-4 h-4 text-red-500" />
              )}

              {isHost && participant.role !== "HOST" && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setOpenMenuId(openMenuId === participant.id ? null : participant.id)
                    }
                    className="p-1 rounded hover:bg-muted"
                    aria-label={t("moreOptions")}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === participant.id && (
                    <div className="absolute right-0 mt-1 w-40 rounded-lg border border-border bg-card text-card-foreground shadow-lg py-1 z-20">
                      <button
                        onClick={() => {
                          onMuteParticipant(participant.id);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        {t("mute")}
                      </button>
                      <button
                        onClick={() => {
                          onRemoveParticipant(participant.id);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-muted"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        {t("remove")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
