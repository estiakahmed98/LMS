"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, Maximize, Loader2 } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

/**
 * Embeds a YouTube video via the IFrame Player API and covers the entire
 * player surface with a transparent overlay that swallows every click. This
 * fully blocks interaction with YouTube's own chrome — the top title/channel
 * links and the "Watch on YouTube" corner link are unreachable, so a viewer
 * can neither click through to youtube.com nor copy the video link from the
 * player.
 *
 * Because the overlay also blocks YouTube's native controls, we render our
 * own play/pause, seek bar, and fullscreen and drive them through the API.
 *
 * Caveat this cannot solve client-side: someone who opens browser DevTools
 * can still read the iframe `src` and recover the video URL. Fully hiding the
 * URL requires self-hosting the video file instead of embedding YouTube.
 */

type PlayerState = "unstarted" | "playing" | "paused" | "buffering" | "ended";

// Minimal shape of the YouTube IFrame Player API we use.
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement | string,
    config: {
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

let apiReadyPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${API_SRC}"]`,
    );

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      resolve();
    };

    if (!existing) {
      const script = document.createElement("script");
      script.src = API_SRC;
      document.head.appendChild(script);
    }
  });

  return apiReadyPromise;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins % 60).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function YouTubePlayer({
  videoId,
  title = "YouTube video player",
  className = "",
}: {
  videoId: string;
  title?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeHostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const rafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [state, setState] = useState<PlayerState>("unstarted");
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const isPlaying = state === "playing" || state === "buffering";

  const embedSrc = getYouTubeEmbedUrl(videoId, {
    enableJsApi: true,
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
  });

  // Build the player once the API and the host element are ready.
  useEffect(() => {
    let cancelled = false;

    const host = iframeHostRef.current;
    if (!host) return;

    // Create the iframe the API will adopt.
    const iframe = document.createElement("iframe");
    iframe.src = embedSrc;
    iframe.title = title;
    iframe.className = "absolute inset-0 h-full w-full";
    iframe.allow =
      "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "true");
    host.appendChild(iframe);

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      const YT = window.YT;
      playerRef.current = new YT.Player(iframe, {
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            setDuration(playerRef.current?.getDuration() ?? 0);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            switch (event.data) {
              case YT.PlayerState.PLAYING:
                setState("playing");
                setDuration(playerRef.current?.getDuration() ?? 0);
                break;
              case YT.PlayerState.PAUSED:
                setState("paused");
                break;
              case YT.PlayerState.BUFFERING:
                setState("buffering");
                break;
              case YT.PlayerState.ENDED:
                setState("ended");
                break;
              default:
                break;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore teardown races
      }
      playerRef.current = null;
      host.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Track current time while playing (and not actively scrubbing).
  useEffect(() => {
    if (!isPlaying || scrubbing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const player = playerRef.current;
      if (player) {
        setCurrent(player.getCurrentTime());
        const d = player.getDuration();
        if (d && d !== duration) setDuration(d);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, scrubbing, duration]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, [isPlaying]);

  const handleSeek = useCallback(
    (value: number) => {
      const player = playerRef.current;
      if (!player) return;
      setCurrent(value);
      player.seekTo(value, true);
    },
    [],
  );

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`group relative aspect-video w-full select-none overflow-hidden rounded-xl bg-black shadow-sm ${className}`}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={iframeHostRef} className="absolute inset-0" />

      {/* Full-surface click blocker: swallows every interaction with YouTube's
          own chrome (title, channel, "Watch on YouTube", share) and instead
          toggles play/pause. */}
      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={togglePlay}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer bg-transparent"
      />

      {/* Center play indicator when paused / not started. */}
      {ready && !isPlaying && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60">
            <Play className="h-8 w-8 translate-x-0.5 text-white" />
          </span>
        </div>
      )}

      {/* Loading spinner until the API is ready. */}
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      {/* Custom control bar. */}
      {ready && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-linear-to-t from-black/80 to-transparent px-3 pb-2 pt-6 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="shrink-0 text-white"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          <span className="shrink-0 text-xs tabular-nums text-white/90">
            {formatTime(current)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            onPointerDown={() => setScrubbing(true)}
            onPointerUp={() => setScrubbing(false)}
            onChange={(event) => handleSeek(Number(event.target.value))}
            aria-label="Seek"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 accent-red-600"
          />
          <span className="shrink-0 text-xs tabular-nums text-white/90">
            {formatTime(duration)}
          </span>
          <button
            type="button"
            onClick={handleFullscreen}
            aria-label="Fullscreen"
            className="shrink-0 text-white"
          >
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
