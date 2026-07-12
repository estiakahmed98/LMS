"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Ban, Droplets, X } from "lucide-react";
import { useMediaDevices } from "@/lib/use-media-devices";
import {
  VIDEO_BACKGROUNDS,
  getBackgroundImageUrl,
  type VideoBackground,
} from "@/lib/virtual-backgrounds";

export interface MediaDeviceSelection {
  audioInputId: string;
  videoInputId: string;
  audioOutputId: string;
}

type SettingsTab = "video" | "background" | "audio";

function BackgroundSwatch({
  background,
  label,
  selected,
  onSelect,
}: {
  background: VideoBackground;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(getBackgroundImageUrl(background));
  }, [background]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center gap-1 focus:outline-none"
      aria-pressed={selected}
    >
      <span
        className={`w-full aspect-video rounded-lg overflow-hidden border-2 flex items-center justify-center bg-muted transition-colors ${
          selected ? "border-primary ring-2 ring-primary/40" : "border-border group-hover:border-primary/50"
        }`}
      >
        {background === "none" ? (
          <Ban className="w-5 h-5 text-muted-foreground" />
        ) : background === "blur" ? (
          <span className="w-full h-full bg-gradient-to-br from-neutral-400 via-neutral-300 to-neutral-500 blur-[3px] flex items-center justify-center">
            <Droplets className="w-5 h-5 text-white/80 blur-none" />
          </span>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
        ) : null}
      </span>
      <span
        className={`text-[11px] font-medium ${selected ? "text-primary" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </button>
  );
}

export default function SettingsPanel({
  onClose,
  devices,
  onChange,
  videoBackground,
  onVideoBackgroundChange,
  blurStrength = 15,
  onBlurStrengthChange,
}: {
  onClose: () => void;
  devices: MediaDeviceSelection;
  onChange: (next: Partial<MediaDeviceSelection>) => void;
  videoBackground: VideoBackground;
  onVideoBackgroundChange: (background: VideoBackground) => void;
  blurStrength?: number;
  onBlurStrengthChange?: (value: number) => void;
}) {
  const t = useTranslations("liveClassroom.settings");
  const { audioInputs, videoInputs, audioOutputs, error } = useMediaDevices(true);
  const [tab, setTab] = useState<SettingsTab>("video");

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: "video", label: t("tabs.video") },
    { key: "background", label: t("tabs.background") },
    { key: "audio", label: t("tabs.audio") },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-card text-card-foreground rounded-t-2xl sm:rounded-xl border border-border w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-card-foreground">{t("title")}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label={t("close")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-3 pt-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors ${
                tab === item.key
                  ? "bg-background text-primary border border-border border-b-background -mb-px"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <p className="text-xs text-amber-600">{error}</p>}

          {tab === "video" && (
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
              <p className="mt-3 text-xs text-muted-foreground">{t("deviceHint")}</p>
            </div>
          )}

          {tab === "background" && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {VIDEO_BACKGROUNDS.map((background) => (
                  <BackgroundSwatch
                    key={background}
                    background={background}
                    label={t(`backgroundOptions.${background}`)}
                    selected={videoBackground === background}
                    onSelect={() => onVideoBackgroundChange(background)}
                  />
                ))}
              </div>
              {videoBackground === "blur" && onBlurStrengthChange && (
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("blurStrength")}
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={30}
                    value={blurStrength}
                    onChange={(e) => onBlurStrengthChange(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <p className="text-xs text-muted-foreground">{blurStrength}</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("backgroundHint")}</p>
            </>
          )}

          {tab === "audio" && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
