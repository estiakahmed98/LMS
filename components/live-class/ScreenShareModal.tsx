"use client";

import { useState } from "react";
import { Monitor, AppWindow, LayoutPanelTop, X } from "lucide-react";

export type ScreenShareSource = "ENTIRE_SCREEN" | "WINDOW" | "TAB";

const SOURCES: { key: ScreenShareSource; label: string; icon: typeof Monitor; hint: string }[] = [
  {
    key: "ENTIRE_SCREEN",
    label: "Entire Screen",
    icon: Monitor,
    hint: "Share everything on your display",
  },
  {
    key: "WINDOW",
    label: "Window",
    icon: AppWindow,
    hint: "Share a single open application window",
  },
  {
    key: "TAB",
    label: "Chrome Tab",
    icon: LayoutPanelTop,
    hint: "Share one browser tab with its audio",
  },
];

export default function ScreenShareModal({
  onCancel,
  onShare,
}: {
  onCancel: () => void;
  onShare: (source: ScreenShareSource) => void;
}) {
  const [selected, setSelected] = useState<ScreenShareSource>("ENTIRE_SCREEN");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-card-foreground">Choose what to share</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-muted"
            aria-label="Cancel screen share"
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
            Your browser will ask you to confirm and pick the exact screen, window, or tab before sharing starts.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onShare(selected)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
