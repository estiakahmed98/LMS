"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useMediaDevices } from "@/lib/use-media-devices";

export interface MediaDeviceSelection {
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
}

export default function SettingsPanel({
  onClose,
  devices,
  onChange,
}: {
  onClose: () => void;
  devices: MediaDeviceSelection;
  onChange: (next: Partial<MediaDeviceSelection>) => void;
}) {
  const t = useTranslations("liveClassroom.settings");
  const { audioInputs, videoInputs, audioOutputs, error } = useMediaDevices(true);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-card text-card-foreground rounded-t-2xl sm:rounded-xl border border-border w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-card-foreground">{t("title")}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label={t("close")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <p className="text-xs text-amber-600">{error}</p>}

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              {t("camera")}
            </label>
            <select
              value={devices.videoInputId}
              onChange={(e) => onChange({ videoInputId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm"
            >
              <option value="">{t("defaultDevice")}</option>
              {videoInputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              {t("microphone")}
            </label>
            <select
              value={devices.audioInputId}
              onChange={(e) => onChange({ audioInputId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm"
            >
              <option value="">{t("defaultDevice")}</option>
              {audioInputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              {t("speaker")}
            </label>
            <select
              value={devices.audioOutputId}
              onChange={(e) => onChange({ audioOutputId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm"
            >
              <option value="">{t("defaultDevice")}</option>
              {audioOutputs.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-muted-foreground">{t("deviceHint")}</p>
        </div>
      </div>
    </div>
  );
}
