"use client";

import { Track, type Room } from "livekit-client";

/**
 * Host-side recorder for live classes when no cloud egress storage is
 * configured. Composites every participant's video onto a hidden canvas
 * (screen share as the main stage, cameras in a grid), mixes all audio
 * through WebAudio, and records the result with MediaRecorder. Chunks are
 * handed to `onChunk` sequentially so the caller can stream them to the
 * server instead of buffering a whole class in memory.
 */

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const FRAME_RATE = 30;
const CHUNK_INTERVAL_MS = 4000;

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

// Timers in a Worker are not throttled when the tab is hidden, so the
// canvas keeps updating even if the host switches tabs mid-class.
const TIMER_WORKER_SRC = `
let timer = null;
onmessage = (e) => {
  if (e.data && e.data.type === "start") {
    clearInterval(timer);
    timer = setInterval(() => postMessage(0), e.data.interval);
  } else {
    clearInterval(timer);
  }
};
`;

interface VideoItem {
  key: string;
  element: HTMLVideoElement;
  name: string;
  isScreen: boolean;
}

export interface LocalRoomRecorderOptions {
  /** Called with each encoded chunk, strictly in order (seq starts at 0). */
  onChunk: (chunk: Blob, seq: number) => Promise<void>;
  onError?: (error: unknown) => void;
}

export function supportsLocalRecording() {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype
  );
}

export class LocalRoomRecorder {
  private room: Room;
  private opts: LocalRoomRecorderOptions;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recorder: MediaRecorder | null = null;
  private audioCtx: AudioContext | null = null;
  private audioDest: MediaStreamAudioDestinationNode | null = null;
  private audioSources = new Map<string, MediaStreamAudioSourceNode>();
  private videoEls = new Map<string, HTMLVideoElement>();
  private timerWorker: Worker | null = null;
  private timerWorkerUrl: string | null = null;
  private fallbackTimer: number | null = null;
  private uploadQueue: Promise<void> = Promise.resolve();
  private uploadFailed = false;
  private seq = 0;
  private running = false;

  constructor(room: Room, opts: LocalRoomRecorderOptions) {
    this.room = room;
    this.opts = opts;
    this.canvas = document.createElement("canvas");
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
  }

  start() {
    if (this.running) return;
    if (!supportsLocalRecording()) {
      throw new Error("This browser does not support in-browser recording.");
    }
    this.running = true;

    this.audioCtx = new AudioContext();
    void this.audioCtx.resume().catch(() => undefined);
    this.audioDest = this.audioCtx.createMediaStreamDestination();

    this.drawFrame();
    this.startTimer();

    const canvasStream = this.canvas.captureStream(FRAME_RATE);
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...this.audioDest.stream.getAudioTracks(),
    ]);

    const mimeType = MIME_CANDIDATES.find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    );
    this.recorder = new MediaRecorder(combined, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 128_000,
    });

    this.recorder.ondataavailable = (event) => {
      if (!event.data || event.data.size === 0) return;
      const chunkSeq = this.seq;
      this.seq += 1;
      this.uploadQueue = this.uploadQueue
        .then(() => this.opts.onChunk(event.data, chunkSeq))
        .catch((error) => {
          this.uploadFailed = true;
          this.opts.onError?.(error);
        });
    };

    this.recorder.start(CHUNK_INTERVAL_MS);
  }

  /** Stops recording, waits for all chunk uploads, and releases resources. */
  async stop(): Promise<{ uploadFailed: boolean }> {
    if (!this.running) return { uploadFailed: this.uploadFailed };
    this.running = false;

    this.stopTimer();

    const recorder = this.recorder;
    this.recorder = null;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
    }
    await this.uploadQueue;

    for (const element of this.videoEls.values()) {
      element.srcObject = null;
    }
    this.videoEls.clear();
    for (const source of this.audioSources.values()) {
      try {
        source.disconnect();
      } catch {
        // already disconnected
      }
    }
    this.audioSources.clear();
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => undefined);
      this.audioCtx = null;
      this.audioDest = null;
    }

    return { uploadFailed: this.uploadFailed };
  }

  private startTimer() {
    try {
      this.timerWorkerUrl = URL.createObjectURL(
        new Blob([TIMER_WORKER_SRC], { type: "application/javascript" }),
      );
      this.timerWorker = new Worker(this.timerWorkerUrl);
      this.timerWorker.onmessage = () => this.drawFrame();
      this.timerWorker.postMessage({
        type: "start",
        interval: Math.round(1000 / FRAME_RATE),
      });
    } catch {
      this.fallbackTimer = window.setInterval(
        () => this.drawFrame(),
        Math.round(1000 / FRAME_RATE),
      );
    }
  }

  private stopTimer() {
    if (this.timerWorker) {
      this.timerWorker.postMessage({ type: "stop" });
      this.timerWorker.terminate();
      this.timerWorker = null;
    }
    if (this.timerWorkerUrl) {
      URL.revokeObjectURL(this.timerWorkerUrl);
      this.timerWorkerUrl = null;
    }
    if (this.fallbackTimer != null) {
      window.clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  private collectTracks() {
    const videos: VideoItem[] = [];
    const seenVideoKeys = new Set<string>();
    const seenAudioKeys = new Set<string>();

    const participants = [
      this.room.localParticipant,
      ...this.room.remoteParticipants.values(),
    ];

    for (const participant of participants) {
      for (const publication of participant.trackPublications.values()) {
        const track = publication.track;
        const mediaTrack = track?.mediaStreamTrack;
        if (!track || !mediaTrack || publication.isMuted) continue;

        if (track.kind === Track.Kind.Video) {
          const key = mediaTrack.id;
          seenVideoKeys.add(key);
          let element = this.videoEls.get(key);
          if (!element) {
            element = document.createElement("video");
            element.muted = true;
            element.playsInline = true;
            element.srcObject = new MediaStream([mediaTrack]);
            void element.play().catch(() => undefined);
            this.videoEls.set(key, element);
          }
          videos.push({
            key,
            element,
            name: participant.name || participant.identity,
            isScreen: publication.source === Track.Source.ScreenShare,
          });
        } else if (track.kind === Track.Kind.Audio && this.audioCtx && this.audioDest) {
          const key = mediaTrack.id;
          seenAudioKeys.add(key);
          if (!this.audioSources.has(key)) {
            try {
              const source = this.audioCtx.createMediaStreamSource(
                new MediaStream([mediaTrack]),
              );
              source.connect(this.audioDest);
              this.audioSources.set(key, source);
            } catch {
              // track ended between enumeration and connect
            }
          }
        }
      }
    }

    for (const [key, element] of this.videoEls) {
      if (seenVideoKeys.has(key)) continue;
      element.srcObject = null;
      this.videoEls.delete(key);
    }
    for (const [key, source] of this.audioSources) {
      if (seenAudioKeys.has(key)) continue;
      try {
        source.disconnect();
      } catch {
        // already disconnected
      }
      this.audioSources.delete(key);
    }

    return videos;
  }

  private drawFrame() {
    if (!this.running && this.recorder == null) return;
    const { ctx } = this;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const videos = this.collectTracks();
    const screen = videos.find((item) => item.isScreen && this.isReady(item.element));
    const cameras = videos.filter((item) => !item.isScreen && this.isReady(item.element));

    if (screen) {
      // Screen share is the stage; cameras become a strip on the right.
      const stripWidth = cameras.length > 0 ? 240 : 0;
      this.drawContain(screen.element, 0, 0, CANVAS_WIDTH - stripWidth, CANVAS_HEIGHT);
      const tileHeight = 135;
      cameras.slice(0, 5).forEach((camera, index) => {
        const x = CANVAS_WIDTH - stripWidth + 4;
        const y = 4 + index * (tileHeight + 4);
        this.drawCover(camera.element, x, y, stripWidth - 8, tileHeight);
        this.drawLabel(camera.name, x, y + tileHeight);
      });
      this.drawLabel(`${screen.name} (screen)`, 0, CANVAS_HEIGHT);
      return;
    }

    if (cameras.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "600 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Audio only", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.textAlign = "left";
      return;
    }

    const count = Math.min(cameras.length, 9);
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const cellWidth = CANVAS_WIDTH / cols;
    const cellHeight = CANVAS_HEIGHT / rows;

    for (let i = 0; i < count; i += 1) {
      const col = i % cols;
      const rowIndex = Math.floor(i / cols);
      // Center the last, possibly incomplete row.
      const itemsInRow = Math.min(cols, count - rowIndex * cols);
      const rowOffset = ((cols - itemsInRow) * cellWidth) / 2;
      const x = rowOffset + col * cellWidth;
      const y = rowIndex * cellHeight;
      this.drawCover(cameras[i].element, x + 2, y + 2, cellWidth - 4, cellHeight - 4);
      this.drawLabel(cameras[i].name, x + 2, y + cellHeight - 2);
    }
  }

  private isReady(element: HTMLVideoElement) {
    return element.videoWidth > 0 && element.videoHeight > 0;
  }

  /** object-fit: cover */
  private drawCover(
    element: HTMLVideoElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const videoRatio = element.videoWidth / element.videoHeight;
    const boxRatio = width / height;
    let sx = 0;
    let sy = 0;
    let sw = element.videoWidth;
    let sh = element.videoHeight;
    if (videoRatio > boxRatio) {
      sw = element.videoHeight * boxRatio;
      sx = (element.videoWidth - sw) / 2;
    } else {
      sh = element.videoWidth / boxRatio;
      sy = (element.videoHeight - sh) / 2;
    }
    this.ctx.drawImage(element, sx, sy, sw, sh, x, y, width, height);
  }

  /** object-fit: contain (used for screen shares to avoid cropping) */
  private drawContain(
    element: HTMLVideoElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const scale = Math.min(width / element.videoWidth, height / element.videoHeight);
    const dw = element.videoWidth * scale;
    const dh = element.videoHeight * scale;
    this.ctx.drawImage(element, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  }

  private drawLabel(text: string, x: number, bottomY: number) {
    const { ctx } = this;
    ctx.font = "600 14px system-ui, sans-serif";
    const paddingX = 8;
    const boxHeight = 24;
    const boxWidth = ctx.measureText(text).width + paddingX * 2;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(x + 6, bottomY - boxHeight - 6, boxWidth, boxHeight);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, x + 6 + paddingX, bottomY - 13);
  }
}
