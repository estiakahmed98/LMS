"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { getInitials } from "@/lib/auth";
import type { TileParticipant } from "@/components/live-class/VideoTile";

interface LiveKitTokenPayload {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

function ParticipantVideoCard({
  participant,
  trackRef,
}: {
  participant?: TileParticipant;
  trackRef?: ReturnType<typeof useTracks>[number];
}) {
  const name = participant?.name ?? trackRef?.participant.name ?? "Participant";
  const isSelf = participant?.isSelf ?? trackRef?.participant.isLocal ?? false;
  const micOn =
    participant?.micOn ?? !(trackRef?.participant.isMicrophoneEnabled === false);
  const hasCamera = Boolean(trackRef?.publication?.track);

  return (
    <div className="relative rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center aspect-video">
      {hasCamera && trackRef && trackRef.publication ? (
        <VideoTrack
          trackRef={trackRef as Parameters<typeof VideoTrack>[0]["trackRef"]}
          className={`w-full h-full object-cover ${isSelf ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-primary/80 text-white flex items-center justify-center text-lg font-semibold">
          {getInitials(name)}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-md px-2 py-1">
        <span className="text-xs text-white font-medium">
          {name}
          {isSelf ? " (You)" : ""}
        </span>
        {!micOn && <span className="text-[10px] text-red-300">Muted</span>}
        {participant?.role === "HOST" && (
          <span className="text-[10px] uppercase tracking-wide bg-primary/80 rounded px-1">
            HOST
          </span>
        )}
      </div>
    </div>
  );
}

function MediaGrid({
  participants,
  micOn,
  cameraOn,
}: {
  participants: TileParticipant[];
  micOn: boolean;
  cameraOn: boolean;
}) {
  const { localParticipant } = useLocalParticipant();
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(micOn);
  }, [localParticipant, micOn]);

  useEffect(() => {
    void localParticipant.setCameraEnabled(cameraOn);
  }, [cameraOn, localParticipant]);

  const tiles = useMemo(() => {
    const byIdentity = new Map(
      cameraTracks.map((track) => [track.participant.identity, track]),
    );

    const ordered = participants.map((participant) => ({
      participant,
      trackRef: byIdentity.get(participant.id),
    }));

    for (const track of cameraTracks) {
      if (participants.some((p) => p.id === track.participant.identity)) continue;
      ordered.push({
        participant: {
          id: track.participant.identity,
          name: track.participant.name || track.participant.identity,
          role: "PARTICIPANT",
          micOn: track.participant.isMicrophoneEnabled,
          cameraOn: Boolean(track.publication?.track),
          handRaised: false,
          isSelf: track.participant.isLocal,
        },
        trackRef: track,
      });
    }

    return ordered;
  }, [cameraTracks, participants]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
      {tiles.map(({ participant, trackRef }) => (
        <ParticipantVideoCard
          key={participant.id}
          participant={participant}
          trackRef={trackRef}
        />
      ))}
    </div>
  );
}

export default function LiveKitMediaStage({
  sessionId,
  participants,
  micOn,
  cameraOn,
  enabled,
  onForceLeave,
}: {
  sessionId: string;
  participants: TileParticipant[];
  micOn: boolean;
  cameraOn: boolean;
  enabled: boolean;
  onForceLeave?: (reason: "removed" | "ended" | "disconnected") => void;
}) {
  const [tokenPayload, setTokenPayload] = useState<LiveKitTokenPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setTokenPayload(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadToken() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/live/sessions/${sessionId}/livekit-token`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to connect media room");
        }
        if (!cancelled) {
          setTokenPayload(data as LiveKitTokenPayload);
        }
      } catch (err) {
        if (!cancelled) {
          setTokenPayload(null);
          setError(err instanceof Error ? err.message : "Failed to connect media room");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadToken();
    return () => {
      cancelled = true;
    };
  }, [enabled, sessionId]);

  // When parent disables media (leave/end/kick), drop token so LiveKitRoom unmounts & disconnects.
  useEffect(() => {
    if (!enabled) {
      setTokenPayload(null);
    }
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="h-full min-h-48 rounded-xl bg-neutral-900 flex items-center justify-center text-sm text-white/50">
        Media disconnected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full min-h-48 rounded-xl bg-neutral-900 flex items-center justify-center text-sm text-white/70">
        Connecting camera & microphone…
      </div>
    );
  }

  if (error || !tokenPayload) {
    return (
      <div className="h-full min-h-48 rounded-xl bg-neutral-900 flex flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm text-amber-300">{error ?? "LiveKit is not ready yet."}</p>
        <p className="text-xs text-white/50">
          Check LIVEKIT_URL / API keys, or wait to be admitted by the host.
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={tokenPayload.token}
      serverUrl={tokenPayload.url}
      connect={enabled}
      audio={micOn}
      video={cameraOn}
      className="h-full"
      onError={(err) => setError(err.message)}
      onDisconnected={() => {
        // Kick / room delete / network — parent decides if we show leave screen.
        if (enabled) onForceLeave?.("disconnected");
      }}
    >
      <MediaGrid participants={participants} micOn={micOn} cameraOn={cameraOn} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
