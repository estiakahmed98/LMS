"use client";

import { useState } from "react";
import { X } from "lucide-react";

const TABS = ["Video", "Audio", "Background", "Accessibility"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Video");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold text-card-foreground">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Close settings">
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
              {item}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {tab === "Video" && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Camera
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>Built-in Camera</option>
                  <option>USB Webcam</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Video theme
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>Follow system</option>
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
            </>
          )}

          {tab === "Audio" && (
            <>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Microphone
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>Default Microphone</option>
                  <option>Headset Mic</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Speaker
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>Default Speaker</option>
                  <option>Headphones</option>
                </select>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                Noise cancellation
                <input type="checkbox" defaultChecked />
              </label>
            </>
          )}

          {tab === "Background" && (
            <div className="grid grid-cols-3 gap-3">
              {["None", "Blur", "Office", "Classroom", "Beach", "Custom"].map((bg) => (
                <button
                  key={bg}
                  className="aspect-video rounded-lg border border-border bg-muted flex items-center justify-center text-xs font-medium hover:border-primary transition-colors"
                >
                  {bg}
                </button>
              ))}
            </div>
          )}

          {tab === "Accessibility" && (
            <>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                Live captions
                <input type="checkbox" />
              </label>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Caption language
                </label>
                <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option>English</option>
                  <option>বাংলা</option>
                  <option>العربية</option>
                  <option>日本語</option>
                  <option>नेपाली</option>
                </select>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
                High-contrast mode
                <input type="checkbox" />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
