"use client";

import { useEffect, useRef, useState } from "react";

export function useLocalCamera(enabled: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    function stopStream() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }

    if (!enabled) {
      stopStream();
      setError(null);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported in this browser");
      return;
    }

    let cancelled = false;
    setError(null);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Camera access denied";
        setError(message);
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [enabled]);

  return { stream, error };
}
