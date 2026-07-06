"use client";

import { type LucideIcon, AlertTriangle } from "lucide-react";

export default function StudentConfirmModal({
  icon: Icon = AlertTriangle,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = true,
  onCancel,
  onConfirm,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card text-center text-card-foreground">
        <div className="space-y-3 p-6">
          <span
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              danger
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-bold text-card-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              danger
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
