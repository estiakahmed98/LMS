"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, AppWindow, LayoutPanelTop, X } from "lucide-react";

export type ScreenShareSource = "ENTIRE_SCREEN" | "WINDOW" | "TAB";

export default function ScreenShareModal({
  onCancel,
  onShare,
}: {
  onCancel: () => void;
  onShare: (source: ScreenShareSource) => void;
}) {
  const t = useTranslations("liveClassroom.screenShare");
  const [selected, setSelected] = useState<ScreenShareSource>("ENTIRE_SCREEN");

  const SOURCES: { key: ScreenShareSource; label: string; icon: typeof Monitor; hint: string }[] = [
    {
      key: "ENTIRE_SCREEN",
      label: t("entireScreen"),
      icon: Monitor,
      hint: t("entireScreenHint"),
    },
    {
      key: "WINDOW",
      label: t("window"),
      icon: AppWindow,
      hint: t("windowHint"),
    },
    {
      key: "TAB",
      label: t("tab"),
      icon: LayoutPanelTop,
      hint: t("tabHint"),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-xl border border-border w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-card-foreground">{t("title")}</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted"
            aria-label={t("cancel")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {SOURCES.map((source) => {
            const Icon = source.icon;
            const isSelected = selected === source.key;
            return (
              <button
                key={source.key}
                onClick={() => setSelected(source.key)}
                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-card-foreground">
                    {source.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{source.hint}</span>
                </span>
              </button>
            );
          })}

          <p className="pt-1 text-[11px] text-muted-foreground">
            {t("note")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onShare(selected)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("share")}
          </button>
        </div>
      </div>
    </div>
  );
}
