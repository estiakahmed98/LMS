"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

const TABS = ["Video", "Audio", "Background", "Accessibility"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("liveClassroom.settings");
  const [tab, setTab] = useState<Tab>("Video");

  const tabLabels: Record<Tab, string> = {
    Video: t("tabs.video"),
    Audio: t("tabs.audio"),
    Background: t("tabs.background"),
    Accessibility: t("tabs.accessibility"),
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-card-foreground">{t("title")}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label={t("close")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-border px-5 gap-4 overflow-x-auto">
          {TABS.map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === item
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {tab === "Video" && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("camera")}
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option>{t("builtInCamera")}</option>
                  <option>{t("usbWebcam")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("videoTheme")}
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option>{t("followSystem")}</option>
                  <option>{t("light")}</option>
                  <option>{t("dark")}</option>
                </select>
              </div>
            </>
          )}

          {tab === "Audio" && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("microphone")}
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option>{t("defaultMicrophone")}</option>
                  <option>{t("headsetMic")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("speaker")}
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option>{t("defaultSpeaker")}</option>
                  <option>{t("headphones")}</option>
                </select>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                {t("noiseCancellation")}
                <input type="checkbox" defaultChecked />
              </label>
            </>
          )}

          {tab === "Background" && (
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["None", t("backgroundOptions.none")],
                  ["Blur", t("backgroundOptions.blur")],
                  ["Office", t("backgroundOptions.office")],
                  ["Classroom", t("backgroundOptions.classroom")],
                  ["Beach", t("backgroundOptions.beach")],
                  ["Custom", t("backgroundOptions.custom")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className="aspect-video rounded-lg border border-border bg-muted flex items-center justify-center text-xs font-medium hover:border-primary transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {tab === "Accessibility" && (
            <>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                {t("liveCaptions")}
                <input type="checkbox" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("captionLanguage")}
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm">
                  <option>English</option>
                  <option>বাংলা</option>
                  <option>العربية</option>
                  <option>日本語</option>
                  <option>नेपाली</option>
                </select>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                {t("highContrastMode")}
                <input type="checkbox" />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
