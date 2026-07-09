"use client";

import { X } from "lucide-react";
import VideoPlayer from "@/components/module/video-player";

export default function RecordingPlayerModal({
  title,
  src,
  videoId,
  userId,
  onClose,
}: {
  title: string;
  src: string;
  videoId: string;
  userId: string;
  onClose: () => void;
}) {
  const isExternal = /^https?:\/\//i.test(src);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-white truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white shrink-0"
            aria-label="Close recording"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isExternal ? (
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video
              src={src}
              controls
              playsInline
              className="w-full h-full"
              preload="metadata"
            />
          </div>
        ) : (
          <VideoPlayer src={src} videoId={videoId} userId={userId} />
        )}
      </div>
    </div>
  );
}
