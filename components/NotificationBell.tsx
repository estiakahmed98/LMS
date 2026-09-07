"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { notificationInboxPath } from "@/lib/notification-links";
import { parseApiJson } from "@/lib/parse-api-json";
import type { AppNotification } from "@/lib/notification-server";

export default function NotificationBell({
  apiPath,
  canEdit = true,
  inboxPath,
}: {
  apiPath: string;
  inboxPath?: string;
  canEdit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const destination = inboxPath ?? notificationInboxPath(apiPath);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath);
      const data = await parseApiJson<{
        notifications?: AppNotification[];
        unreadCount?: number;
        error?: string;
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load notifications");
      setError("");
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setError("Unable to load notifications. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), 60_000);
    window.addEventListener("notifications-updated", load);
    return () => { window.clearInterval(intervalId); window.removeEventListener("notifications-updated", load); };
  }, [load]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openNotification(item: AppNotification) {
    setOpen(false);
    router.push(`${destination}?notification=${encodeURIComponent(item.id)}`);
  }

  async function markAllRead() {
    if (!canEdit) return;
    try {
      const response = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) throw new Error("Unable to update notifications.");
      window.dispatchEvent(new Event("notifications-updated"));
    } catch { setError("Unable to update notifications. Please retry."); }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) void load();
        }}
        className="relative inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold text-card-foreground">Notifications</p>
            {canEdit && unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-3 py-2 text-xs text-destructive">{error}</p>}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openNotification(item)}
                  className={`block w-full border-b border-border px-3 py-3 text-left hover:bg-muted/60 ${
                    item.readAt ? "opacity-70" : "bg-primary/5"
                  }`}
                >
                  <p className="text-sm font-semibold text-card-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {item.message.replace(/\s+\S+:[\w-]+$/, "")}
                  </p>
                </button>
              ))
            )}
          </div>
          <button onClick={() => { setOpen(false); router.push(destination); }} className="w-full border-t p-3 text-sm font-semibold text-primary">View all notifications</button>
        </div>
      )}
    </div>
  );
}
