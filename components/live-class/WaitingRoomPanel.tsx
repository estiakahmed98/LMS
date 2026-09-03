"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCheck, LoaderCircle, UserCheck, UserX } from "lucide-react";
import { getInitials } from "@/lib/auth";

export interface WaitingUser {
  id: string;
  name: string;
}

export default function WaitingRoomPanel({
  waitingUsers,
  onApprove,
  onReject,
  placement = "fixed",
}: {
  waitingUsers: WaitingUser[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  placement?: "fixed" | "absolute";
}) {
  const t = useTranslations("liveClassroom.waitingRoom");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);

  if (waitingUsers.length === 0) return null;

  async function runForUser(id: string, action: (userId: string) => Promise<void>) {
    setPendingIds((current) => new Set(current).add(id));
    try {
      await action(id);
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function approveAll() {
    if (approvingAll) return;
    setApprovingAll(true);
    try {
      // Sequential requests keep each room-state update deterministic and
      // avoid a burst of competing host mutations on slower connections.
      for (const user of waitingUsers) {
        await runForUser(user.id, onApprove);
      }
    } finally {
      setApprovingAll(false);
    }
  }

  return (
    <div
      className={`${placement} left-2 right-2 top-16 z-[70] overflow-hidden rounded-xl border border-amber-400/40 bg-card text-card-foreground shadow-2xl sm:left-auto sm:right-4 sm:top-[4.5rem] sm:w-80`}
      role="region"
      aria-label={t("title", { count: waitingUsers.length })}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-amber-500/10 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t("title", { count: waitingUsers.length })}
          </p>
          <p className="text-[11px] text-muted-foreground">{t("hostHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => void approveAll()}
          disabled={approvingAll || pendingIds.size > 0}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {approvingAll ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCheck className="h-3.5 w-3.5" />
          )}
          {approvingAll ? t("admittingAll") : t("admitAll")}
        </button>
      </div>
      <div className="max-h-[min(19rem,45dvh)] divide-y divide-border overflow-y-auto overscroll-contain">
        {waitingUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                {getInitials(user.name)}
              </span>
              <span className="truncate text-sm font-medium">{user.name}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => void runForUser(user.id, onApprove)}
                disabled={approvingAll || pendingIds.has(user.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("approve", { name: user.name })}
              >
                {pendingIds.has(user.id) ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                <span>{t("admit")}</span>
              </button>
              <button
                type="button"
                onClick={() => void runForUser(user.id, onReject)}
                disabled={approvingAll || pendingIds.has(user.id)}
                className="rounded-lg bg-red-500/10 p-1.5 text-red-600 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={t("reject", { name: user.name })}
              >
                <UserX className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
