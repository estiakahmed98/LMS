"use client";

import { useTranslations } from "next-intl";
import { PhoneOff } from "lucide-react";

export default function LeaveConfirmModal({
  isHost,
  onCancel,
  onConfirm,
}: {
  isHost: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("liveClassroom.leaveConfirm");

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-xl border border-border w-full max-w-sm overflow-hidden text-center">
        <div className="p-6 space-y-3">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <PhoneOff className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-bold text-card-foreground">
            {isHost ? t("endTitle") : t("leaveTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isHost ? t("endDescription") : t("leaveDescription")}
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-border p-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
          >
            {isHost ? t("endForAll") : t("leave")}
          </button>
        </div>
      </div>
    </div>
  );
}
