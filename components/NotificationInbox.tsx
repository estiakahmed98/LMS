"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import type { AppNotification } from "@/lib/notification-server";
import { subscribeNotificationRefresh } from "@/lib/notification-refresh";
import { safeNotificationAction } from "@/lib/notification-links";
import {
  formatNotificationMessage,
  notificationEventDate,
} from "@/lib/notification-time";

export default function NotificationInbox() {
  return (
    <Suspense fallback={<p>Loading notifications...</p>}>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const notificationId = useSearchParams().get("notification");
  const [items, setItems] = useState<
    (AppNotification & { campaignId?: string | null })[]
  >([]);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [category, setCategory] = useState("all");
  const [unread, setUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/notifications?category=${category}&unread=${unread}&page=${page}`,
          { cache: "no-store", signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setItems(data.notifications);
        setTotal(data.total);
        setError("");
      } catch (err) {
        if (!signal?.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load notifications.",
          );
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [category, unread, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const unsubscribe = subscribeNotificationRefresh(
      () => void load(controller.signal),
    );
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [load]);

  const markRead = useCallback(
    async (item?: AppNotification) => {
      setBusy(true);
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            item ? { notificationId: item.id } : { markAll: true },
          ),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        window.dispatchEvent(new Event("notifications-updated"));
        await load();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to mark notifications read.",
        );
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  useEffect(() => {
    const id = notificationId;
    if (!id) return;
    const controller = new AbortController();
    void fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.notifications?.[0])
          throw new Error(data.error || "Notification not found.");
        const item = data.notifications[0];
        setSelected(item);
        if (!item.readAt) await markRead(item);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [markRead, notificationId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your course activity, updates and announcements.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            disabled={busy}
            onClick={() => void markRead()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <select
          aria-label="Notification category"
          className="rounded-lg border bg-card px-3 py-2 text-sm"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All activity</option>
          <option value="event">Notifications</option>
          <option value="announcement">Announcements</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unread}
            onChange={(e) => {
              setUnread(e.target.checked);
              setPage(1);
            }}
          />
          Unread only
        </label>
        <span className="text-sm text-muted-foreground">
          {total} notifications
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {selected && (
        <section
          className="rounded-xl border border-primary/30 bg-card p-5"
          aria-label="Notification details"
        >
          <div className="flex justify-between gap-4">
            <h2 className="text-lg font-semibold">{selected.title}</h2>
            <button
              aria-label="Close notification details"
              onClick={() => {
                setSelected(null);
                window.history.replaceState(null, "", window.location.pathname);
              }}
              className="text-sm text-muted-foreground"
            >
              Close
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {notificationEventDate(selected.message, selected.createdAt)}
          </p>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm">
            {selected.message}
          </p>
          {safeNotificationAction(selected.actionUrl) && (
            <Link
              className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              href={safeNotificationAction(selected.actionUrl)!}
            >
              View related activity
            </Link>
          )}
        </section>
      )}
      <div
        className="overflow-hidden rounded-xl border bg-card"
        aria-busy={loading}
      >
        {loading && !items.length ? (
          <p className="p-8 text-center text-muted-foreground">
            Loading notifications…
          </p>
        ) : !items.length ? (
          <div className="p-12 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3" />
            <p>No notifications to show.</p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setSelected(item);
                window.history.replaceState(
                  null,
                  "",
                  `${window.location.pathname}?notification=${encodeURIComponent(item.id)}`,
                );
                if (!item.readAt) void markRead(item);
              }}
              className={`block w-full border-b p-4 text-left last:border-0 hover:bg-muted/50 ${!item.readAt ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-center gap-2">
                {!item.readAt && (
                  <span
                    className="size-2 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                )}
                <h2 className="font-semibold">{item.title}</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.campaignId ? "Announcement" : "Notification"}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {formatNotificationMessage(item.message)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {notificationEventDate(item.message, item.createdAt)}
              </p>
            </button>
          ))
        )}
      </div>
      <div className="flex items-center justify-end gap-4 text-sm">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
          className="disabled:opacity-40"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / 20))}
        </span>
        <button
          disabled={page * 20 >= total || loading}
          onClick={() => setPage((p) => p + 1)}
          className="disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
