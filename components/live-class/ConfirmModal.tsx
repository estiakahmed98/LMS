"use client";

import { type LucideIcon, AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  icon: Icon = AlertTriangle,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  onCancel,
  onConfirm,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-sm overflow-hidden text-center">
        <div className="p-6 space-y-3">
          <span
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
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
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
