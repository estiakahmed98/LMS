"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import AdminLayout from "@/components/AdminLayout";
import { EntryRow, StatCard, groupByDay } from "@/components/admin/activity-log-shared";
import type { AdminActivityPage } from "@/lib/admin-activity-types";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  LoaderCircle,
  Mail,
  ShieldAlert,
  UserCog,
} from "lucide-react";

const PAGE_SIZE = 25;

interface ActorProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string | null;
}

export default function AdminActivityActorPage({ userId }: { userId: string }) {
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const numberFormatter = new Intl.NumberFormat(localeTag);
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dayFormatter = new Intl.DateTimeFormat(localeTag, { dateStyle: "full" });

  const [actor, setActor] = useState<ActorProfile | null>(null);
  const [actorLoading, setActorLoading] = useState(true);
  const [actorError, setActorError] = useState<string | null>(null);

  const [data, setData] = useState<AdminActivityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setActorLoading(true);
    setActorError(null);
    fetch(`/api/admin/activity-log/actor/${userId}`, { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Failed to load user.");
        if (!cancelled) setActor(json.actor);
      })
      .catch((caught) => {
        if (!cancelled) {
          setActor(null);
          setActorError(caught instanceof Error ? caught.message : "Failed to load user.");
        }
      })
      .finally(() => {
        if (!cancelled) setActorLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("actorId", userId);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const response = await fetch(`/api/admin/activity-log?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load activity.");
      const json: AdminActivityPage = await response.json();
      setData(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  }, [userId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const groups = useMemo(
    () => groupByDay(data?.entries ?? [], dayFormatter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.entries, localeTag],
  );

  return (
    <AdminLayout title={tAdmin("activityLog") ?? "Activity Log"}>
      <div className="space-y-6 p-6">
        <Link
          href="/admin/activity-log"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to activity log
        </Link>

        {actorLoading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Loading user…
          </div>
        ) : actorError || !actor ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {actorError ?? "User not found."}
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-card-foreground">{actor.name}</h1>
                    <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {actor.role.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {actor.email}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p className="flex items-center justify-end gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Last active
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {actor.lastActive ? dateTimeFormatter.format(new Date(actor.lastActive)) : "Never"}
                  </p>
                </div>
              </div>
            </div>

            {data?.stats && (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={History}
                  label="Total actions"
                  value={numberFormatter.format(data.stats.total)}
                />
                <StatCard
                  icon={ShieldAlert}
                  label="Critical"
                  value={numberFormatter.format(data.stats.critical)}
                  tone={data.stats.critical > 0 ? "critical" : "default"}
                />
                <StatCard
                  icon={UserCog}
                  label="Failed logins"
                  value={numberFormatter.format(data.stats.failedLogins)}
                  tone={data.stats.failedLogins > 0 ? "critical" : "default"}
                />
                <StatCard
                  icon={History}
                  label="Deletions"
                  value={numberFormatter.format(data.stats.deletions)}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {loading ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Loading activity…
              </div>
            ) : groups.length > 0 ? (
              <div className="space-y-6">
                {groups.map(([day, entries]) => (
                  <div key={day}>
                    <div className="mb-2 flex items-center gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {day}
                      </p>
                      <span className="text-[11px] text-muted-foreground">
                        {numberFormatter.format(entries.length)}{" "}
                        {entries.length === 1 ? "event" : "events"}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="divide-y divide-border">
                        {entries.map((entry) => (
                          <EntryRow
                            key={entry.id}
                            entry={entry}
                            dateTimeFormatter={dateTimeFormatter}
                            hideActor
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No activity recorded for this user.
                </p>
              </div>
            )}

            {data && data.total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {numberFormatter.format(page)} of {numberFormatter.format(totalPages)} ·{" "}
                  {numberFormatter.format(data.total)} events
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
