"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  Captions,
  Settings,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { getVideoProgress, saveVideoProgress } from "@/lib/video-progress";

const SPEEDS = [1, 1.25, 1.5, 2] as const;
const COMPLETION_THRESHOLD = 0.9;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(h > 0 ? 2 : 1, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export interface VideoPlayerProps {
  src: string;
  videoId: string;
  userId: string;
  captionsSrc?: string;
  poster?: string;
  onProgress?: (percent: number) => void;
  onFinished?: () => void;
}

const VideoPlayer = forwardRef<HTMLDivElement, VideoPlayerProps>(
  function VideoPlayer(
    { src, videoId, userId, captionsSrc, poster, onProgress, onFinished },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasResumedRef = useRef(false);
    const finishedRef = useRef(false);
    const lastSavedRef = useRef(0);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState<number>(1);
    const [fullscreen, setFullscreen] = useState(false);
    const [pipActive, setPipActive] = useState(false);
    const [captionsOn, setCaptionsOn] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [seeking, setSeeking] = useState(false);
    const [pipSupported, setPipSupported] = useState(false);
    const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      setPipSupported(
        typeof document !== "undefined" && !!document.pictureInPictureEnabled,
      );
    }, []);

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    // Resume from last saved position once metadata is available.
    useEffect(() => {
      hasResumedRef.current = false;
      finishedRef.current = false;
      lastSavedRef.current = 0;
      setPlaying(false);
      setCurrentTime(0);
    }, [videoId, userId]);

    function handleLoadedMetadata() {
      const video = videoRef.current;
      if (!video) return;
      setDuration(video.duration);

      if (!hasResumedRef.current) {
        hasResumedRef.current = true;
        const saved = getVideoProgress(userId, videoId);
        if (saved && saved.positionSeconds > 1 && !saved.completed) {
          video.currentTime = Math.min(saved.positionSeconds, video.duration - 0.5);
          setCurrentTime(video.currentTime);
        }
      }
    }

    function persistProgress(video: HTMLVideoElement) {
      if (!userId || !video.duration) return;
      const percent = Math.min(100, (video.currentTime / video.duration) * 100);
      const completed = percent >= COMPLETION_THRESHOLD * 100;
      saveVideoProgress(userId, videoId, {
        positionSeconds: video.currentTime,
        durationSeconds: video.duration,
        watchedPercent: percent,
        completed,
      });
      onProgress?.(percent);
      if (completed && !finishedRef.current) {
        finishedRef.current = true;
        onFinished?.();
      }
    }

    function handleTimeUpdate() {
      const video = videoRef.current;
      if (!video || seeking) return;
      setCurrentTime(video.currentTime);

      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }

      if (video.currentTime - lastSavedRef.current >= 3) {
        lastSavedRef.current = video.currentTime;
        persistProgress(video);
      }
    }

    function handleEnded() {
      const video = videoRef.current;
      setPlaying(false);
      if (video) persistProgress(video);
    }

    function togglePlay() {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        video.play();
        setPlaying(true);
      } else {
        video.pause();
        setPlaying(false);
        persistProgress(video);
      }
    }

    function seekTo(seconds: number) {
      const video = videoRef.current;
      if (!video || !duration) return;
      video.currentTime = Math.max(0, Math.min(duration, seconds));
      setCurrentTime(video.currentTime);
    }

    function skip(delta: number) {
      seekTo(currentTime + delta);
    }

    function handleScrubberChange(e: React.ChangeEvent<HTMLInputElement>) {
      const pct = Number(e.target.value);
      const seconds = (pct / 100) * duration;
      setCurrentTime(seconds);
    }

    function handleScrubberCommit(
      e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>,
    ) {
      const pct = Number(e.currentTarget.value);
      seekTo((pct / 100) * duration);
      setSeeking(false);
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
      const value = Number(e.target.value);
      setVolume(value);
      const video = videoRef.current;
      if (video) {
        video.volume = value;
        video.muted = value === 0;
      }
      setMuted(value === 0);
    }

    function toggleMute() {
      const video = videoRef.current;
      if (!video) return;
      const next = !muted;
      video.muted = next;
      setMuted(next);
      if (!next && volume === 0) {
        setVolume(0.5);
        video.volume = 0.5;
      }
    }

    function changeSpeed(rate: number) {
      setSpeed(rate);
      if (videoRef.current) videoRef.current.playbackRate = rate;
      setShowSpeedMenu(false);
    }

    function toggleFullscreen() {
      const container = containerRef.current;
      if (!container) return;
      if (!document.fullscreenElement) {
        container.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }

    async function togglePip() {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await video.requestPictureInPicture();
        }
      } catch {
        // PiP not supported / blocked — silently ignore
      }
    }

    function toggleCaptions() {
      const video = videoRef.current;
      if (!video) return;
      const track = video.textTracks[0];
      if (!track) return;
      const next = !captionsOn;
      track.mode = next ? "showing" : "hidden";
      setCaptionsOn(next);
    }

    useEffect(() => {
      function onFullscreenChange() {
        setFullscreen(!!document.fullscreenElement);
      }
      document.addEventListener("fullscreenchange", onFullscreenChange);
      return () =>
        document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      function onEnterPip() {
        setPipActive(true);
      }
      function onLeavePip() {
        setPipActive(false);
      }
      video.addEventListener("enterpictureinpicture", onEnterPip);
      video.addEventListener("leavepictureinpicture", onLeavePip);
      return () => {
        video.removeEventListener("enterpictureinpicture", onEnterPip);
        video.removeEventListener("leavepictureinpicture", onLeavePip);
      };
    }, []);

    // Persist immediately on unmount / tab close so progress isn't lost.
    useEffect(() => {
      function onBeforeUnload() {
        const video = videoRef.current;
        if (video) persistProgress(video);
      }
      window.addEventListener("beforeunload", onBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", onBeforeUnload);
        const video = videoRef.current;
        if (video) persistProgress(video);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, userId]);

    function scheduleHideControls() {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => {
        if (playing) setShowControls(false);
      }, 2500);
    }

    const progressPercent = duration ? (currentTime / duration) * 100 : 0;
    const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

    const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
      <div
        ref={containerRef}
        className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black"
        onMouseMove={() => {
          setShowControls(true);
          scheduleHideControls();
        }}
        onMouseLeave={() => {
          if (playing) setShowControls(false);
        }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="h-full w-full"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
          playsInline
        >
          {captionsSrc && (
            <track kind="captions" src={captionsSrc} srcLang="en" label="English" default={false} />
          )}
        </video>

        {!playing && (
          <button
            onClick={togglePlay}
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary transition hover:bg-white">
              <Play size={28} className="ml-1" fill="currentColor" />
            </span>
          </button>
        )}

        <div
          className={`absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 ${
            showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPercent || 0}
            onMouseDown={() => setSeeking(true)}
            onChange={handleScrubberChange}
            onMouseUp={handleScrubberCommit}
            onTouchStart={() => setSeeking(true)}
            onTouchEnd={handleScrubberCommit}
            className="video-scrubber relative z-10 w-full cursor-pointer accent-primary"
            style={{
              background: `linear-gradient(to right, var(--color-primary) ${progressPercent}%, rgba(255,255,255,0.35) ${bufferedPercent}%, rgba(255,255,255,0.15) ${bufferedPercent}%)`,
            }}
            aria-label="Seek"
          />

          <div className="mt-1.5 flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              className="text-white hover:text-primary transition-colors"
            >
              {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            <button
              onClick={() => skip(-10)}
              aria-label="Rewind 10 seconds"
              className="hidden sm:block text-white hover:text-primary transition-colors"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => skip(10)}
              aria-label="Forward 10 seconds"
              className="hidden sm:block text-white hover:text-primary transition-colors"
            >
              <RotateCw size={16} />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
                className="text-white hover:text-primary transition-colors"
              >
                <VolumeIcon size={18} />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-primary cursor-pointer"
                aria-label="Volume"
              />
            </div>

            <span className="text-[11px] sm:text-xs font-medium text-white/90 tabular-nums whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {captionsSrc && (
                <button
                  onClick={toggleCaptions}
                  aria-label={captionsOn ? "Turn off captions" : "Turn on captions"}
                  className={`transition-colors ${captionsOn ? "text-primary" : "text-white hover:text-primary"}`}
                >
                  <Captions size={17} />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu((v) => !v)}
                  aria-label="Playback speed"
                  className="flex items-center gap-1 text-white hover:text-primary transition-colors text-xs font-semibold"
                >
                  <Settings size={16} />
                  <span className="hidden sm:inline">{speed}x</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-20 rounded-lg bg-neutral-900 border border-white/10 py-1 shadow-lg z-20">
                    {SPEEDS.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changeSpeed(rate)}
                        className={`block w-full px-3 py-1.5 text-left text-xs ${
                          rate === speed ? "text-primary font-semibold" : "text-white/80 hover:bg-white/10"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {pipSupported && (
                <button
                  onClick={togglePip}
                  aria-label={pipActive ? "Exit picture-in-picture" : "Picture-in-picture"}
                  className={`hidden sm:block transition-colors ${pipActive ? "text-primary" : "text-white hover:text-primary"}`}
                >
                  <PictureInPicture2 size={17} />
                </button>
              )}

              <button
                onClick={toggleFullscreen}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                className="text-white hover:text-primary transition-colors"
              >
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default VideoPlayer;
