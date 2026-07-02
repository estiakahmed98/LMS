"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

const VideoPlayer = forwardRef<
  HTMLDivElement,
  {
    durationMinutes: number;
    watched: boolean;
    onFinished: () => void;
  }
>(function VideoPlayer({ durationMinutes, watched, onFinished }, ref) {
  const totalSeconds = Math.max(1, durationMinutes * 60);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(watched ? totalSeconds : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= totalSeconds) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setPlaying(false);
          onFinished();
          return totalSeconds;
        }
        return next;
      });
    }, 1000 / 30);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, totalSeconds]);

  const progressPercent = Math.min(100, (elapsed / totalSeconds) * 100);

  return (
    <div
      ref={ref}
      className="relative flex aspect-video items-center justify-center rounded-xl bg-gray-900 overflow-hidden"
    >
      <button
        onClick={() => setPlaying((p) => !p)}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary transition hover:bg-white"
        aria-label={playing ? "Pause video" : "Play video"}
      >
        {playing ? (
          <Pause size={26} fill="currentColor" />
        ) : (
          <Play size={28} className="ml-1" fill="currentColor" />
        )}
      </button>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/60 to-transparent">
        <div className="w-full h-1 rounded-full bg-white/25 mb-2 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs font-medium text-white/80">
          {formatTime(elapsed)} / {formatTime(totalSeconds)}
        </div>
      </div>
    </div>
  );
});

export default VideoPlayer;
