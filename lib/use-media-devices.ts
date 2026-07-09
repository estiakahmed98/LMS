"use client";

import { useCallback, useEffect, useState } from "react";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export function useMediaDevices(enabled = true) {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceOption[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceOption[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || typeof navigator === "undefined" || !navigator.mediaDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const map = (kind: MediaDeviceKind) =>
        devices
          .filter((device) => device.kind === kind && device.deviceId)
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `${kind} ${index + 1}`,
          }));

      setAudioInputs(map("audioinput"));
      setVideoInputs(map("videoinput"));
      setAudioOutputs(map("audiooutput"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list devices");
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();

    if (!enabled || typeof navigator === "undefined" || !navigator.mediaDevices) {
      return;
    }

    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
    };
  }, [enabled, refresh]);

  return { audioInputs, videoInputs, audioOutputs, error, refresh };
}
