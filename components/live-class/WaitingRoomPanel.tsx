"use client";

import { useTranslations } from "next-intl";
import { UserCheck, UserX } from "lucide-react";
import { getInitials } from "@/lib/auth";

export interface WaitingUser {
  id: string;
  name: string;
}

export default function WaitingRoomPanel({
  waitingUsers,
  onApprove,
  onReject,
}: {
  waitingUsers: WaitingUser[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const t = useTranslations("liveClassroom.waitingRoom");

  if (waitingUsers.length === 0) return null;

  return (
    <div className="absolute top-14 sm:top-16 right-2 sm:right-4 left-2 sm:left-auto w-auto sm:w-72 rounded-xl border border-border bg-card text-card-foreground shadow-lg z-40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-amber-500/10">
        <p className="text-sm font-semibold text-amber-700">
          {t("title", { count: waitingUsers.length })}
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border">
        {waitingUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                {getInitials(user.name)}
              </span>
              <span className="text-sm truncate">{user.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onApprove(user.id)}
                className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20"
                aria-label={t("approve", { name: user.name })}
              >
                <UserCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReject(user.id)}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20"
                aria-label={t("reject", { name: user.name })}
              >
                <UserX className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
