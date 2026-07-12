"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import {
  ConnectionState,
  LocalVideoTrack,
  ParticipantEvent,
  RoomEvent,
  Track,
  type RemoteParticipant,
} from "livekit-client";
import {
  BackgroundBlur,
  VirtualBackground,
  supportsBackgroundProcessors,
} from "@livekit/track-processors";
import type { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import "@livekit/components-styles";
import { getBackgroundImageUrl, type VideoBackground } from "@/lib/virtual-backgrounds";
import { LocalRoomRecorder } from "@/lib/live-local-recorder";
import { Hand } from "lucide-react";
import { getInitials } from "@/lib/auth";
import type { TileParticipant } from "@/components/live-class/VideoTile";
import {
  decodeLiveKitSignal,
  encodeLiveKitSignal,
  type LiveHostCommand,
} from "@/lib/livekit-signaling";

interface LiveKitTokenPayload {
  token: string;
  url: string;
  roomName: string;
  identity: string;
}

function isHostSender(
  participant: { identity: string; metadata?: string } | undefined,
  hostIdentity: string,
) {
  if (!participant || participant.identity !== hostIdentity) return false;

  try {
    const metadata = participant.metadata ? JSON.parse(participant.metadata) : null;
    return metadata?.role === "HOST";
  } catch {
    return false;
  }
}

function ParticipantVideoCard({
  participant,
  trackRef,
  isScreen = false,
}: {
  participant?: TileParticipant;
  trackRef?: TrackReferenceOrPlaceholder;
  isScreen?: boolean;
}) {
  const name = participant?.name ?? trackRef?.participant.name ?? "Participant";
  const isSelf = participant?.isSelf ?? trackRef?.participant.isLocal ?? false;
  const micOn =
    trackRef?.participant.isMicrophoneEnabled ?? participant?.micOn ?? true;
  const hasVideo = Boolean(trackRef && "publication" in trackRef && trackRef.publication?.track);
  const handRaised = participant?.handRaised ?? false;

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center ${
        isScreen ? "aspect-video ring-2 ring-green-500" : "aspect-video"
      }`}
    >
      {hasVideo && trackRef && "publication" in trackRef && trackRef.publication ? (
        <VideoTrack
          trackRef={trackRef as Parameters<typeof VideoTrack>[0]["trackRef"]}
          className={`w-full h-full object-cover ${isSelf && !isScreen ? "scale-x-[-1]" : ""}`}
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
          {isScreen ? " · Screen" : ""}
        </span>
        {!micOn && !isScreen && <span className="text-[10px] text-red-300">Muted</span>}
        {participant?.role === "HOST" && (
          <span className="text-[10px] uppercase tracking-wide bg-primary/80 rounded px-1">
            HOST
          </span>
        )}
      </div>

      {handRaised && !isScreen && (
        <div className="absolute top-2 right-2 rounded-full bg-amber-500/90 p-1.5 text-white">
          <Hand className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
}

export type LiveConnectionState = "connected" | "reconnecting" | "disconnected";

function publishLiveKitSignal(
  room: { state: ConnectionState },
  localParticipant: { publishData: (data: Uint8Array, options: { reliable: boolean }) => Promise<void> },
  signal: Parameters<typeof encodeLiveKitSignal>[0],
) {
  if (room.state !== ConnectionState.Connected) return;
  void localParticipant
    .publishData(encodeLiveKitSignal(signal), { reliable: true })
    .catch((error) => {
      console.warn("LIVEKIT_PUBLISH_DATA_WARN", error);
    });
}

function MediaRoomBridge({
  sessionId,
  participants,
  micOn,
  cameraOn,
  screenShareRequest,
  hostCommand,
  handRaised,
  handRaiseSyncSeq = 0,
  hostIdentity,
  audioInputId,
  videoInputId,
  audioOutputId,
  videoBackground,
  localRecordingActive = false,
  onLocalRecordingStopped,
  onScreenShareChange,
  onRemoteMute,
  onParticipantsMediaSync,
  onHandStateSync,
  onConnectionStateChange,
}: {
  sessionId: string;
  participants: TileParticipant[];
  micOn: boolean;
  cameraOn: boolean;
  screenShareRequest: number | null;
  hostCommand: LiveHostCommand | null;
  handRaised: boolean;
  handRaiseSyncSeq?: number;
  hostIdentity: string;
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
  videoBackground: VideoBackground;
  localRecordingActive?: boolean;
  onLocalRecordingStopped?: () => void;
  onScreenShareChange?: (sharing: boolean) => void;
  onRemoteMute?: () => void;
  onParticipantsMediaSync?: (
    updates: Array<{
      id: string;
      micOn: boolean;
      cameraOn: boolean;
      isScreenSharing: boolean;
    }>,
  ) => void;
  onHandStateSync?: (hands: Record<string, boolean>) => void;
  onConnectionStateChange?: (state: LiveConnectionState) => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const lastScreenRequest = useRef<number | null>(null);
  const lastHostCommand = useRef<number | null>(null);
  const lastHandSent = useRef<boolean | null>(null);
  const lastSyncedHands = useRef("");
  const [handMap, setHandMap] = useState<Record<string, boolean>>({});

  const applyRemoteHand = (senderId: string, raised: boolean) => {
    if (!senderId || senderId === localParticipant.identity) return;
    setHandMap((prev) => {
      if (prev[senderId] === raised) return prev;
      return { ...prev, [senderId]: raised };
    });
  };

  // Notify parent after handMap updates (never inside a setState updater).
  useEffect(() => {
    const fingerprint = Object.entries(handMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, raised]) => `${id}:${raised ? 1 : 0}`)
      .join("|");
    if (fingerprint === lastSyncedHands.current) return;
    lastSyncedHands.current = fingerprint;
    onHandStateSync?.(handMap);
  }, [handMap, onHandStateSync]);

  const remoteHandFingerprint = useMemo(
    () =>
      participants
        .filter((participant) => participant.id !== localParticipant.identity)
        .map((participant) => `${participant.id}:${participant.handRaised ? 1 : 0}`)
        .sort()
        .join("|"),
    [localParticipant.identity, participants],
  );

  // Server poll is the durable source of truth for remote hand state.
  useEffect(() => {
    setHandMap((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const participant of participants) {
        if (participant.id === localParticipant.identity) continue;
        if (next[participant.id] !== participant.handRaised) {
          next[participant.id] = participant.handRaised;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [localParticipant.identity, remoteHandFingerprint, participants]);

  useEffect(() => {
    lastHandSent.current = null;
  }, [handRaiseSyncSeq]);

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const screenTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  useEffect(() => {
    void localParticipant.setMicrophoneEnabled(micOn);
  }, [localParticipant, micOn]);

  useEffect(() => {
    void localParticipant.setCameraEnabled(cameraOn);
  }, [cameraOn, localParticipant]);

  useEffect(() => {
    if (!videoInputId) return;
    void room.switchActiveDevice("videoinput", videoInputId).catch(() => undefined);
  }, [room, videoInputId]);

  useEffect(() => {
    if (!audioInputId) return;
    void room.switchActiveDevice("audioinput", audioInputId).catch(() => undefined);
  }, [audioInputId, room]);

  useEffect(() => {
    if (!audioOutputId) return;
    void room.switchActiveDevice("audiooutput", audioOutputId).catch(() => undefined);
  }, [audioOutputId, room]);

  // Apply virtual background (blur / image) to the local camera track.
  // setProcessor() restarts the camera track, which re-fires this effect via
  // cameraTracks — so all processor changes are serialized through one promise
  // chain and compared against the actually-applied state. Without this the
  // effect keeps re-applying the processor and the camera blinks forever.
  const desiredBackground = useRef<VideoBackground>(videoBackground);
  desiredBackground.current = videoBackground;
  const appliedBackground = useRef<{ track: LocalVideoTrack; background: VideoBackground } | null>(
    null,
  );
  const backgroundQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    const publication = localParticipant.getTrackPublication(Track.Source.Camera);
    const track = publication?.track;
    if (!(track instanceof LocalVideoTrack)) return;

    backgroundQueue.current = backgroundQueue.current.then(async () => {
      // Read the latest desired background at execution time so queued-up
      // intermediate selections collapse into a single no-op.
      const background = desiredBackground.current;
      const applied = appliedBackground.current;
      if (applied?.track === track && applied.background === background) return;

      try {
        if (background === "none") {
          if (track.getProcessor()) await track.stopProcessor();
        } else if (!supportsBackgroundProcessors()) {
          console.warn("VIRTUAL_BACKGROUND_UNSUPPORTED");
        } else if (background === "blur") {
          await track.setProcessor(BackgroundBlur(15));
        } else {
          const imageUrl = getBackgroundImageUrl(background);
          if (!imageUrl) return;
          await track.setProcessor(VirtualBackground(imageUrl));
        }
        appliedBackground.current = { track, background };
      } catch (error) {
        console.warn("VIRTUAL_BACKGROUND_WARN", error);
      }
    });
  }, [cameraTracks, localParticipant, videoBackground]);

  // Host-side local recording (no cloud egress storage configured). The
  // recorder composites all tracks on a canvas and streams webm chunks to
  // the server; stopping flushes the last chunks and finalizes.
  const localRecorderRef = useRef<LocalRoomRecorder | null>(null);
  const finishLocalRecording = useCallback(
    async (recorder: LocalRoomRecorder, failed = false) => {
      let uploadFailed = failed;
      try {
        const result = await recorder.stop();
        uploadFailed = uploadFailed || result.uploadFailed;
      } catch (error) {
        console.warn("LOCAL_RECORDING_STOP_WARN", error);
        uploadFailed = true;
      }
      try {
        await fetch(`/api/live/sessions/${sessionId}/recording/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ failed: uploadFailed }),
        });
      } catch (error) {
        console.warn("LOCAL_RECORDING_FINALIZE_WARN", error);
      }
      onLocalRecordingStopped?.();
    },
    [onLocalRecordingStopped, sessionId],
  );
  const finishLocalRecordingRef = useRef(finishLocalRecording);
  finishLocalRecordingRef.current = finishLocalRecording;

  useEffect(() => {
    if (localRecordingActive && !localRecorderRef.current) {
      try {
        const recorder = new LocalRoomRecorder(room, {
          onChunk: async (chunk, seq) => {
            const res = await fetch(
              `/api/live/sessions/${sessionId}/recording/chunk?seq=${seq}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: chunk,
              },
            );
            if (!res.ok) {
              throw new Error(`Recording chunk upload failed (${res.status})`);
            }
          },
          onError: (error) => console.warn("LOCAL_RECORDING_UPLOAD_WARN", error),
        });
        recorder.start();
        localRecorderRef.current = recorder;
      } catch (error) {
        console.warn("LOCAL_RECORDING_START_WARN", error);
        localRecorderRef.current = null;
        // Tell the server the recording never started so it doesn't stay ACTIVE.
        void fetch(`/api/live/sessions/${sessionId}/recording/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ failed: true }),
        })
          .catch(() => undefined)
          .finally(() => onLocalRecordingStopped?.());
      }
    } else if (!localRecordingActive && localRecorderRef.current) {
      const recorder = localRecorderRef.current;
      localRecorderRef.current = null;
      void finishLocalRecordingRef.current(recorder);
    }
  }, [localRecordingActive, onLocalRecordingStopped, room, sessionId]);

  // Unmount (leave / session end) — flush and finalize an active recording.
  useEffect(() => {
    return () => {
      const recorder = localRecorderRef.current;
      if (recorder) {
        localRecorderRef.current = null;
        void finishLocalRecordingRef.current(recorder);
      }
    };
  }, []);

  useEffect(() => {
    const mapState = (state: ConnectionState): LiveConnectionState => {
      switch (state) {
        case ConnectionState.Reconnecting:
        case ConnectionState.SignalReconnecting:
          return "reconnecting";
        case ConnectionState.Disconnected:
          return "disconnected";
        default:
          // Connected + initial Connecting: no scary banner while first joining.
          return "connected";
      }
    };
    const onStateChanged = (state: ConnectionState) => {
      onConnectionStateChange?.(mapState(state));
    };

    onStateChanged(room.state);
    room.on(RoomEvent.ConnectionStateChanged, onStateChanged);

    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onStateChanged);
    };
  }, [onConnectionStateChange, room]);

  // Parent requests start/stop screen share (seq number).
  useEffect(() => {
    if (screenShareRequest == null) return;
    if (lastScreenRequest.current === screenShareRequest) return;
    lastScreenRequest.current = screenShareRequest;

    const wantsShare = screenShareRequest > 0;
    void (async () => {
      try {
        await localParticipant.setScreenShareEnabled(wantsShare);
        onScreenShareChange?.(localParticipant.isScreenShareEnabled);
      } catch {
        onScreenShareChange?.(false);
      }
    })();
  }, [localParticipant, onScreenShareChange, screenShareRequest]);

  // Browser "Stop sharing" on the share chrome — reflect in parent.
  useEffect(() => {
    const onLocal = () => {
      onScreenShareChange?.(localParticipant.isScreenShareEnabled);
    };
    room.on(RoomEvent.LocalTrackPublished, onLocal);
    room.on(RoomEvent.LocalTrackUnpublished, onLocal);
    return () => {
      room.off(RoomEvent.LocalTrackPublished, onLocal);
      room.off(RoomEvent.LocalTrackUnpublished, onLocal);
    };
  }, [localParticipant, onScreenShareChange, room]);

  // Publish / consume classroom control signals.
  useEffect(() => {
    const participantCleanups = new Map<string, () => void>();

    const attachParticipant = (participant: RemoteParticipant) => {
      if (participantCleanups.has(participant.identity)) return;

      const onParticipantData = (payload: Uint8Array) => {
        const signal = decodeLiveKitSignal(payload);
        if (signal?.type === "HAND") {
          applyRemoteHand(participant.identity, signal.raised);
        }
      };

      participant.on(ParticipantEvent.DataReceived, onParticipantData);
      participantCleanups.set(participant.identity, () => {
        participant.off(ParticipantEvent.DataReceived, onParticipantData);
      });
    };

    const detachParticipant = (participant: RemoteParticipant) => {
      const cleanup = participantCleanups.get(participant.identity);
      cleanup?.();
      participantCleanups.delete(participant.identity);
    };

    for (const participant of room.remoteParticipants.values()) {
      attachParticipant(participant);
    }

    const onParticipantConnected = (participant: RemoteParticipant) => {
      attachParticipant(participant);
    };

    const onParticipantDisconnected = (participant: RemoteParticipant) => {
      detachParticipant(participant);
    };

    const onData = (payload: Uint8Array, participant?: RemoteParticipant) => {
      const signal = decodeLiveKitSignal(payload);
      if (!signal) return;
      const isHostControl = isHostSender(
        participant as { identity: string; metadata?: string } | undefined,
        hostIdentity,
      );

      if (signal.type === "MUTE" && isHostControl && signal.targetId === localParticipant.identity) {
        void localParticipant.setMicrophoneEnabled(false);
        onRemoteMute?.();
        return;
      }

      if (
        signal.type === "MUTE_ALL" &&
        isHostControl &&
        participant?.identity !== localParticipant.identity
      ) {
        void localParticipant.setMicrophoneEnabled(false);
        onRemoteMute?.();
        return;
      }

      if (signal.type === "HAND" && participant?.identity) {
        applyRemoteHand(participant.identity, signal.raised);
        return;
      }

      if (signal.type === "LOWER_HAND" && isHostControl) {
        if (signal.targetId === localParticipant.identity) {
          setHandMap((prev) => ({ ...prev, [localParticipant.identity]: false }));
          publishLiveKitSignal(room, localParticipant, { type: "HAND", raised: false });
        } else {
          applyRemoteHand(signal.targetId, false);
        }
      }
    };

    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.DataReceived, onData);
      for (const cleanup of participantCleanups.values()) cleanup();
      participantCleanups.clear();
    };
  }, [hostIdentity, localParticipant, onRemoteMute, room]);

  // Host commands from parent → publishData.
  useEffect(() => {
    if (!hostCommand) return;
    if (lastHostCommand.current === hostCommand.seq) return;
    lastHostCommand.current = hostCommand.seq;

    const signal =
      hostCommand.kind === "MUTE"
        ? encodeLiveKitSignal({ type: "MUTE", targetId: hostCommand.targetId })
        : hostCommand.kind === "MUTE_ALL"
          ? encodeLiveKitSignal({ type: "MUTE_ALL" })
          : encodeLiveKitSignal({ type: "LOWER_HAND", targetId: hostCommand.targetId });

    if (room.state === ConnectionState.Connected) {
      void localParticipant.publishData(signal, { reliable: true }).catch((error) => {
        console.warn("LIVEKIT_HOST_COMMAND_WARN", error);
      });
    }

    if (hostCommand.kind === "MUTE_ALL") {
      // Optimistic UI for remotes; self (host) stays unmuted.
      setHandMap((prev) => prev);
    }

    if (hostCommand.kind === "LOWER_HAND") {
      setHandMap((prev) => ({ ...prev, [hostCommand.targetId]: false }));
    }
  }, [hostCommand, localParticipant, room]);

  // Broadcast local hand raise changes.
  useEffect(() => {
    if (lastHandSent.current === handRaised) return;
    lastHandSent.current = handRaised;

    setHandMap((prev) => {
      if (prev[localParticipant.identity] === handRaised) return prev;
      return { ...prev, [localParticipant.identity]: handRaised };
    });

    publishLiveKitSignal(room, localParticipant, { type: "HAND", raised: handRaised });
  }, [handRaised, localParticipant, room]);

  // Sync mic/camera/screen from LiveKit track state up to parent panel.
  const lastMediaFingerprint = useRef("");
  useEffect(() => {
    const identities = new Set<string>();
    for (const track of cameraTracks) identities.add(track.participant.identity);
    for (const track of screenTracks) identities.add(track.participant.identity);
    for (const p of participants) identities.add(p.id);
    identities.add(localParticipant.identity);

    const screenIds = new Set(screenTracks.map((t) => t.participant.identity));

    const updates = [...identities].map((id) => {
      const cam = cameraTracks.find((t) => t.participant.identity === id);
      const participant = cam?.participant ?? room.getParticipantByIdentity(id);
      return {
        id,
        micOn: participant?.isMicrophoneEnabled ?? true,
        cameraOn: Boolean(cam?.publication?.track),
        isScreenSharing: screenIds.has(id),
      };
    });

    const fingerprint = updates
      .map((u) => `${u.id}:${u.micOn ? 1 : 0}${u.cameraOn ? 1 : 0}${u.isScreenSharing ? 1 : 0}`)
      .sort()
      .join("|");
    if (fingerprint === lastMediaFingerprint.current) return;
    lastMediaFingerprint.current = fingerprint;

    onParticipantsMediaSync?.(updates);
  }, [
    cameraTracks,
    localParticipant.identity,
    onParticipantsMediaSync,
    participants,
    room,
    screenTracks,
  ]);

  const cameraTiles = useMemo(() => {
    const byIdentity = new Map(
      cameraTracks.map((track) => [track.participant.identity, track]),
    );

    const ordered = participants.map((participant) => {
      const merged: TileParticipant = {
        ...participant,
        handRaised: handMap[participant.id] ?? participant.handRaised,
        micOn:
          byIdentity.get(participant.id)?.participant.isMicrophoneEnabled ??
          participant.micOn,
        cameraOn: Boolean(byIdentity.get(participant.id)?.publication?.track),
        isScreenSharing: screenTracks.some(
          (t) => t.participant.identity === participant.id,
        ),
      };
      return {
        participant: merged,
        trackRef: byIdentity.get(participant.id),
      };
    });

    for (const track of cameraTracks) {
      if (participants.some((p) => p.id === track.participant.identity)) continue;
      ordered.push({
        participant: {
          id: track.participant.identity,
          name: track.participant.name || track.participant.identity,
          role: "PARTICIPANT",
          micOn: track.participant.isMicrophoneEnabled,
          cameraOn: Boolean(track.publication?.track),
          handRaised: handMap[track.participant.identity] ?? false,
          isSelf: track.participant.isLocal,
          isScreenSharing: screenTracks.some(
            (t) => t.participant.identity === track.participant.identity,
          ),
        },
        trackRef: track,
      });
    }

    return ordered;
  }, [cameraTracks, handMap, participants, screenTracks]);

  const screenTiles = useMemo(() => {
    return screenTracks
      .filter((track) => track.publication?.track)
      .map((track) => {
        const base =
          participants.find((p) => p.id === track.participant.identity) ??
          ({
            id: track.participant.identity,
            name: track.participant.name || track.participant.identity,
            role: "PARTICIPANT" as const,
            micOn: track.participant.isMicrophoneEnabled,
            cameraOn: false,
            handRaised: false,
            isSelf: track.participant.isLocal,
          } satisfies TileParticipant);

        return {
          participant: {
            ...base,
            isScreenSharing: true,
            handRaised: handMap[base.id] ?? base.handRaised,
          },
          trackRef: track,
        };
      });
  }, [handMap, participants, screenTracks]);

  return (
    <div className="space-y-3">
      {screenTiles.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:gap-4">
          {screenTiles.map(({ participant, trackRef }) => (
            <ParticipantVideoCard
              key={`screen-${participant.id}`}
              participant={participant}
              trackRef={trackRef}
              isScreen
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {cameraTiles.map(({ participant, trackRef }) => (
          <ParticipantVideoCard
            key={participant.id}
            participant={participant}
            trackRef={trackRef}
          />
        ))}
      </div>
    </div>
  );
}

export default function LiveKitMediaStage({
  sessionId,
  participants,
  micOn,
  cameraOn,
  screenShareRequest,
  hostCommand,
  handRaised,
  handRaiseSyncSeq = 0,
  hostIdentity,
  audioInputId = "",
  videoInputId = "",
  audioOutputId = "",
  videoBackground = "none",
  localRecordingActive = false,
  enabled,
  onLocalRecordingStopped,
  onForceLeave,
  onScreenShareChange,
  onRemoteMute,
  onParticipantsMediaSync,
  onHandStateSync,
  onConnectionStateChange,
}: {
  sessionId: string;
  participants: TileParticipant[];
  micOn: boolean;
  cameraOn: boolean;
  /** Positive seq = start share, negative seq = stop share, null = no pending request */
  screenShareRequest: number | null;
  hostCommand: LiveHostCommand | null;
  handRaised: boolean;
  handRaiseSyncSeq?: number;
  hostIdentity: string;
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
  videoBackground?: VideoBackground;
  /** True while a host-side (local mode) recording should be running. */
  localRecordingActive?: boolean;
  enabled: boolean;
  onLocalRecordingStopped?: () => void;
  onForceLeave?: (reason: "removed" | "ended" | "disconnected") => void;
  onScreenShareChange?: (sharing: boolean) => void;
  onRemoteMute?: () => void;
  onParticipantsMediaSync?: (
    updates: Array<{
      id: string;
      micOn: boolean;
      cameraOn: boolean;
      isScreenSharing: boolean;
    }>,
  ) => void;
  onHandStateSync?: (hands: Record<string, boolean>) => void;
  onConnectionStateChange?: (state: LiveConnectionState) => void;
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
        if (enabled) onForceLeave?.("disconnected");
      }}
    >
      <MediaRoomBridge
        sessionId={sessionId}
        participants={participants}
        micOn={micOn}
        cameraOn={cameraOn}
        screenShareRequest={screenShareRequest}
        hostCommand={hostCommand}
        handRaised={handRaised}
        handRaiseSyncSeq={handRaiseSyncSeq}
        hostIdentity={hostIdentity}
        audioInputId={audioInputId}
        videoInputId={videoInputId}
        audioOutputId={audioOutputId}
        videoBackground={videoBackground}
        localRecordingActive={localRecordingActive}
        onLocalRecordingStopped={onLocalRecordingStopped}
        onScreenShareChange={onScreenShareChange}
        onRemoteMute={onRemoteMute}
        onParticipantsMediaSync={onParticipantsMediaSync}
        onHandStateSync={onHandStateSync}
        onConnectionStateChange={onConnectionStateChange}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
