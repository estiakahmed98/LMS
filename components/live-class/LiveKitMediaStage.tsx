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
import { ChevronLeft, ChevronRight, Hand, MicOff, Pin, PinOff, Star } from "lucide-react";
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

export type LiveViewMode = "speaker" | "gallery";

export interface LiveSharePolicy {
  /** True → any participant may screen share; false → host + allowed only. */
  everyone: boolean;
  allowed: string[];
}

export function canParticipantShare(
  policy: LiveSharePolicy,
  participantId: string,
  isHost: boolean,
) {
  return isHost || policy.everyone || policy.allowed.includes(participantId);
}

const GALLERY_PAGE_SIZE = 9;

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
  variant = "grid",
  speaking = false,
  pinned = false,
  spotlighted = false,
  canSpotlight = false,
  onTogglePin,
  onToggleSpotlight,
}: {
  participant?: TileParticipant;
  trackRef?: TrackReferenceOrPlaceholder;
  isScreen?: boolean;
  /** grid = aspect-video cell, fill = stretch to container, strip = small side tile */
  variant?: "grid" | "fill" | "strip";
  speaking?: boolean;
  pinned?: boolean;
  spotlighted?: boolean;
  canSpotlight?: boolean;
  onTogglePin?: () => void;
  onToggleSpotlight?: () => void;
}) {
  const name = participant?.name ?? trackRef?.participant.name ?? "Participant";
  const isSelf = participant?.isSelf ?? trackRef?.participant.isLocal ?? false;
  const micOn =
    trackRef?.participant.isMicrophoneEnabled ?? participant?.micOn ?? true;
  const hasVideo = Boolean(trackRef && "publication" in trackRef && trackRef.publication?.track);
  const handRaised = participant?.handRaised ?? false;

  const sizeClass =
    variant === "fill"
      ? "w-full h-full min-h-0"
      : variant === "strip"
        ? "w-40 sm:w-44 lg:w-full shrink-0 aspect-video"
        : "aspect-video";

  return (
    <div
      className={`group relative rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center ${sizeClass} ${
        isScreen
          ? "ring-2 ring-green-500"
          : speaking
            ? "ring-2 ring-green-400"
            : ""
      }`}
    >
      {hasVideo && trackRef && "publication" in trackRef && trackRef.publication ? (
        <VideoTrack
          trackRef={trackRef as Parameters<typeof VideoTrack>[0]["trackRef"]}
          className={`w-full h-full ${isScreen ? "object-contain bg-black" : "object-cover"} ${isSelf && !isScreen ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div
          className={`rounded-full bg-primary/80 text-white flex items-center justify-center font-semibold ${
            variant === "strip" ? "w-10 h-10 text-sm" : "w-14 h-14 text-lg"
          }`}
        >
          {getInitials(name)}
        </div>
      )}

      {/* Hover actions: pin (everyone) + spotlight (host) — camera tiles only. */}
      {!isScreen && (onTogglePin || (canSpotlight && onToggleSpotlight)) && (
        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`rounded-md p-1.5 text-white shadow ${pinned ? "bg-primary" : "bg-black/60 hover:bg-black/80"}`}
              aria-pressed={pinned}
              aria-label="pin"
            >
              {pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}
          {canSpotlight && onToggleSpotlight && (
            <button
              type="button"
              onClick={onToggleSpotlight}
              className={`rounded-md p-1.5 text-white shadow ${spotlighted ? "bg-amber-500" : "bg-black/60 hover:bg-black/80"}`}
              aria-pressed={spotlighted}
              aria-label="spotlight"
            >
              <Star className={`w-3.5 h-3.5 ${spotlighted ? "fill-current" : ""}`} />
            </button>
          )}
        </div>
      )}

      {spotlighted && !isScreen && (
        <span className="absolute top-1.5 right-8 rounded-full bg-amber-500/90 p-1.5 text-white">
          <Star className="w-3 h-3 fill-current" />
        </span>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-md px-2 py-1 max-w-[calc(100%-1rem)]">
        {!micOn && !isScreen && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
        <span className="text-xs text-white font-medium truncate">
          {name}
          {isSelf ? " (You)" : ""}
          {isScreen ? " · Screen" : ""}
        </span>
        {participant?.role === "HOST" && !isScreen && (
          <span className="text-[10px] uppercase tracking-wide bg-primary/80 rounded px-1 shrink-0">
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
  isHost = false,
  viewMode = "speaker",
  pinnedId = null,
  spotlightIds = [],
  sharePolicy = { everyone: false, allowed: [] },
  audioInputId,
  videoInputId,
  audioOutputId,
  videoBackground,
  localRecordingActive = false,
  onTogglePin,
  onToggleSpotlight,
  onSpotlightSync,
  onSharePolicySync,
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
  isHost?: boolean;
  viewMode?: LiveViewMode;
  pinnedId?: string | null;
  spotlightIds?: string[];
  sharePolicy?: LiveSharePolicy;
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
  videoBackground: VideoBackground;
  localRecordingActive?: boolean;
  onTogglePin?: (id: string | null) => void;
  onToggleSpotlight?: (id: string) => void;
  onSpotlightSync?: (ids: string[]) => void;
  onSharePolicySync?: (policy: LiveSharePolicy) => void;
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
        await fetch(`/api/live/sessions/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recording-finalize", failed: uploadFailed }),
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
              `/api/live/sessions/${sessionId}?action=recording-chunk&seq=${seq}`,
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
        void fetch(`/api/live/sessions/${sessionId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "recording-finalize", failed: true }),
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

  // Track the loudest current speaker for speaker view + speaking rings.
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      setActiveSpeakerId(room.activeSpeakers[0]?.identity ?? null);
    };
    update();
    room.on(RoomEvent.ActiveSpeakersChanged, update);
    return () => {
      room.off(RoomEvent.ActiveSpeakersChanged, update);
    };
  }, [room]);

  // Host broadcasts spotlight + share policy on change, and re-sends the
  // current state to late joiners so everyone converges.
  const lastPolicyBroadcast = useRef("");
  useEffect(() => {
    if (!isHost) return;

    const broadcast = () => {
      publishLiveKitSignal(room, localParticipant, {
        type: "SPOTLIGHT",
        ids: spotlightIds,
      });
      publishLiveKitSignal(room, localParticipant, {
        type: "SHARE_POLICY",
        everyone: sharePolicy.everyone,
        allowed: sharePolicy.allowed,
      });
    };

    const fingerprint = JSON.stringify([spotlightIds, sharePolicy]);
    if (fingerprint !== lastPolicyBroadcast.current) {
      lastPolicyBroadcast.current = fingerprint;
      broadcast();
    }

    const onParticipantConnected = () => broadcast();
    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
    };
  }, [isHost, localParticipant, room, sharePolicy, spotlightIds]);

  // Enforce the host's share policy: if this participant is sharing and the
  // permission is revoked, stop the share.
  useEffect(() => {
    if (isHost) return;
    const allowed = canParticipantShare(sharePolicy, localParticipant.identity, false);
    if (!allowed && localParticipant.isScreenShareEnabled) {
      void localParticipant
        .setScreenShareEnabled(false)
        .then(() => onScreenShareChange?.(false))
        .catch(() => undefined);
    }
  }, [isHost, localParticipant, onScreenShareChange, screenTracks, sharePolicy]);

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
        return;
      }

      if (signal.type === "SPOTLIGHT" && isHostControl) {
        onSpotlightSync?.(signal.ids);
        return;
      }

      if (signal.type === "SHARE_POLICY" && isHostControl) {
        onSharePolicySync?.({ everyone: signal.everyone, allowed: signal.allowed });
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
  }, [hostIdentity, localParticipant, onRemoteMute, onSharePolicySync, onSpotlightSync, room]);

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

  const [galleryPage, setGalleryPage] = useState(0);

  const renderCameraCard = (
    tile: (typeof cameraTiles)[number],
    variant: "grid" | "fill" | "strip",
  ) => (
    <ParticipantVideoCard
      key={tile.participant.id}
      participant={tile.participant}
      trackRef={tile.trackRef}
      variant={variant}
      speaking={tile.participant.id === activeSpeakerId}
      pinned={pinnedId === tile.participant.id}
      spotlighted={spotlightIds.includes(tile.participant.id)}
      canSpotlight={isHost}
      onTogglePin={
        onTogglePin
          ? () =>
              onTogglePin(
                pinnedId === tile.participant.id ? null : tile.participant.id,
              )
          : undefined
      }
      onToggleSpotlight={
        isHost && onToggleSpotlight
          ? () => onToggleSpotlight(tile.participant.id)
          : undefined
      }
    />
  );

  // --- Speaker view: pick what fills the main stage (Zoom-style priority:
  // screen shares → pinned → spotlights → active speaker → host). ---
  const tileById = new Map(cameraTiles.map((tile) => [tile.participant.id, tile]));
  let mainTiles: typeof cameraTiles = [];
  const mainIsScreen = screenTiles.length > 0;
  if (!mainIsScreen) {
    const pinnedTile = pinnedId ? tileById.get(pinnedId) : undefined;
    if (pinnedTile) {
      mainTiles = [pinnedTile];
    } else {
      const spotTiles = spotlightIds
        .map((id) => tileById.get(id))
        .filter((tile): tile is (typeof cameraTiles)[number] => Boolean(tile))
        .slice(0, 4);
      if (spotTiles.length > 0) {
        mainTiles = spotTiles;
      } else {
        const fallback =
          (activeSpeakerId ? tileById.get(activeSpeakerId) : undefined) ??
          tileById.get(hostIdentity) ??
          cameraTiles[0];
        if (fallback) mainTiles = [fallback];
      }
    }
  }
  const mainIds = new Set(mainTiles.map((tile) => tile.participant.id));
  const stripTiles = cameraTiles.filter((tile) => !mainIds.has(tile.participant.id));

  // --- Gallery view: screen shares first, then cameras, paginated. ---
  const galleryItems: Array<{
    key: string;
    isScreen: boolean;
    tile: (typeof cameraTiles)[number];
  }> = [
    ...screenTiles.map((tile) => ({
      key: `screen-${tile.participant.id}`,
      isScreen: true,
      tile,
    })),
    ...cameraTiles.map((tile) => ({
      key: tile.participant.id,
      isScreen: false,
      tile,
    })),
  ];
  const galleryPageCount = Math.max(1, Math.ceil(galleryItems.length / GALLERY_PAGE_SIZE));
  const currentPage = Math.min(galleryPage, galleryPageCount - 1);
  const pageItems = galleryItems.slice(
    currentPage * GALLERY_PAGE_SIZE,
    currentPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE,
  );
  const galleryCols = pageItems.length <= 1 ? 1 : pageItems.length <= 4 ? 2 : 3;

  if (viewMode === "gallery") {
    return (
      <div className="h-full flex flex-col min-h-0 gap-2">
        <div
          className={`flex-1 min-h-0 grid gap-2 auto-rows-fr ${
            galleryCols === 1
              ? "grid-cols-1"
              : galleryCols === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
          }`}
          data-live-main-stage
        >
          {pageItems.map((item) =>
            item.isScreen ? (
              <ParticipantVideoCard
                key={item.key}
                participant={item.tile.participant}
                trackRef={item.tile.trackRef}
                variant="fill"
                isScreen
              />
            ) : (
              renderCameraCard(item.tile, "fill")
            ),
          )}
        </div>
        {galleryPageCount > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-3 pb-1">
            <button
              type="button"
              onClick={() => setGalleryPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded-full bg-white/10 p-1.5 text-white disabled:opacity-30 hover:bg-white/20"
              aria-label="previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-white/70 font-medium">
              {currentPage + 1} / {galleryPageCount}
            </span>
            <button
              type="button"
              onClick={() =>
                setGalleryPage(Math.min(galleryPageCount - 1, currentPage + 1))
              }
              disabled={currentPage >= galleryPageCount - 1}
              className="rounded-full bg-white/10 p-1.5 text-white disabled:opacity-30 hover:bg-white/20"
              aria-label="next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col-reverse lg:flex-row min-h-0 gap-2">
      <div className="flex-1 min-h-0" data-live-main-stage>
        {mainIsScreen ? (
          <div
            className={`h-full grid gap-2 ${screenTiles.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
          >
            {screenTiles.map(({ participant, trackRef }) => (
              <ParticipantVideoCard
                key={`screen-${participant.id}`}
                participant={participant}
                trackRef={trackRef}
                variant="fill"
                isScreen
              />
            ))}
          </div>
        ) : (
          <div
            className={`h-full grid gap-2 ${
              mainTiles.length > 1
                ? "grid-cols-1 sm:grid-cols-2 auto-rows-fr"
                : "grid-cols-1"
            }`}
          >
            {mainTiles.map((tile) => renderCameraCard(tile, "fill"))}
          </div>
        )}
      </div>

      {(mainIsScreen ? cameraTiles : stripTiles).length > 0 && (
        <div className="shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden lg:w-48 xl:w-56">
          {(mainIsScreen ? cameraTiles : stripTiles).map((tile) =>
            renderCameraCard(tile, "strip"),
          )}
        </div>
      )}
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
  isHost = false,
  viewMode = "speaker",
  pinnedId = null,
  spotlightIds = [],
  sharePolicy = { everyone: false, allowed: [] },
  audioInputId = "",
  videoInputId = "",
  audioOutputId = "",
  videoBackground = "none",
  localRecordingActive = false,
  enabled,
  onTogglePin,
  onToggleSpotlight,
  onSpotlightSync,
  onSharePolicySync,
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
  isHost?: boolean;
  viewMode?: LiveViewMode;
  pinnedId?: string | null;
  spotlightIds?: string[];
  sharePolicy?: LiveSharePolicy;
  audioInputId?: string;
  videoInputId?: string;
  audioOutputId?: string;
  videoBackground?: VideoBackground;
  /** True while a host-side (local mode) recording should be running. */
  localRecordingActive?: boolean;
  enabled: boolean;
  onTogglePin?: (id: string | null) => void;
  onToggleSpotlight?: (id: string) => void;
  onSpotlightSync?: (ids: string[]) => void;
  onSharePolicySync?: (policy: LiveSharePolicy) => void;
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
        const res = await fetch(
          `/api/live/sessions/${sessionId}?resource=livekit-token`,
        );
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
        isHost={isHost}
        viewMode={viewMode}
        pinnedId={pinnedId}
        spotlightIds={spotlightIds}
        sharePolicy={sharePolicy}
        onTogglePin={onTogglePin}
        onToggleSpotlight={onToggleSpotlight}
        onSpotlightSync={onSpotlightSync}
        onSharePolicySync={onSharePolicySync}
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
