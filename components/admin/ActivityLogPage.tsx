"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useLocale, useTranslations } from "next-intl";
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  History,
  LoaderCircle,
  Lock,
  PlusCircle,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Video,
} from "lucide-react";
import type { AdminActivityEntry, AdminActivityPage } from "@/lib/admin-activity-types";

const PAGE_SIZE = 20;

type DateFilterValue =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "custom";

const dateFilters: DateFilterValue[] = ["all", "today", "yesterday", "last7", "last30", "custom"];

const dateFilterLabels: Record<DateFilterValue, string> = {
  all: "All Dates",
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 Days",
  last30: "Last 30 Days",
  custom: "Custom Range",
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function resolveDateRange(
  filter: DateFilterValue,
  customStart: string,
  customEnd: string,
): { from?: string; to?: string } {
  const today = startOfDay(new Date());

  switch (filter) {
    case "today":
      return { from: today.toISOString(), to: addDays(today, 1).toISOString() };
    case "yesterday":
      return { from: addDays(today, -1).toISOString(), to: today.toISOString() };
    case "last7":
      return { from: addDays(today, -6).toISOString(), to: addDays(today, 1).toISOString() };
    case "last30":
      return { from: addDays(today, -29).toISOString(), to: addDays(today, 1).toISOString() };
    case "custom":
      return {
        from: customStart ? startOfDay(new Date(customStart)).toISOString() : undefined,
        to: customEnd ? addDays(startOfDay(new Date(customEnd)), 1).toISOString() : undefined,
      };
    default:
      return {};
  }
}

const entityIcons: Record<string, typeof History> = {
  LiveClass: Video,
  LiveClassSession: Video,
  Course: BookOpen,
  Module: BookOpen,
  User: UserCog,
  RolePermission: Lock,
  Upload: Upload,
  Certificate: Award,
  Assessment: ClipboardCheck,
};

function actionIcon(action: string) {
  if (action.endsWith(".created")) return PlusCircle;
  if (action.endsWith(".deleted")) return Trash2;
  if (action === "permissions.updated") return ShieldCheck;
  if (action.startsWith("upload.")) return Upload;
  return SettingsIcon;
}

function actionTone(action: string) {
  if (action.endsWith(".created") || action === "role.assigned") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (action.endsWith(".deleted") || action === "role.unassigned") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (action.endsWith(".updated") || action === "permissions.updated") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatActionLabel(action: string) {
  const [entityPart, verbPart] = action.split(".");
  if (!verbPart) return action;
  const verb = verbPart.replace(/([A-Z])/g, " $1").toLowerCase();
  const entity = entityPart.replace(/([A-Z])/g, " $1").trim();
  return `${entity} ${verb}`.replace(/\s+/g, " ").trim();
}

function describeEntry(entry: AdminActivityEntry) {
  const actor = entry.actorName ?? "System";
  return `${actor} — ${formatActionLabel(entry.action)}`;
}

function groupByDay(entries: AdminActivityEntry[], formatter: Intl.DateTimeFormat) {
  const groups = new Map<string, AdminActivityEntry[]>();
  for (const entry of entries) {
    const key = formatter.format(new Date(entry.createdAt));
    const bucket = groups.get(key) ?? [];
    bucket.push(entry);
    groups.set(key, bucket);
  }
  return Array.from(groups.entries());
}

export default function ActivityLogPage() {
  const t = useTranslations("adminActivityLogPage");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const localeTag = locale === "bn" ? "bn-BD" : "en-US";
  const dateTimeFormatter = new Intl.DateTimeFormat(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const dayFormatter = new Intl.DateTimeFormat(localeTag, { dateStyle: "full" });
  const numberFormatter = new Intl.NumberFormat(localeTag);

  function label(key: string, fallback: string, values?: Record<string, string>) {
    return t.has(key) ? t(key, values) : fallback;
  }

  const [data, setData] = useState<AdminActivityPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<"all" | string>("all");
  const [action, setAction] = useState<"all" | string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);

  const dateRange = useMemo(
    () => resolveDateRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (entity !== "all") params.set("entity", entity);
      if (action !== "all") params.set("action", action);
      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const response = await fetch(`/api/admin/activity-log?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load activity log.");
      const json: AdminActivityPage = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  }, [query, entity, action, dateRange.from, dateRange.to, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, entity, action, dateFilter, customStart, customEnd]);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const groups = useMemo(
    () => groupByDay(data?.entries ?? [], dayFormatter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.entries, localeTag],
  );

  return (
    <AdminLayout title={tAdmin("activityLog") ?? "Activity Log"}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">
            {label("title", "Activity Log")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {label(
              "subtitle",
              "A complete, tamper-evident record of every create, update, and delete action performed across the admin panel.",
            )}
          </p>
        </div>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 xl:grid-cols-16">
            <label className="relative xl:col-span-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={label(
                  "filters.searchPlaceholder",
                  "Search by actor, action, or record ID…",
                )}
                className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilterValue)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-3"
            >
              {dateFilters.map((item) => (
                <option key={item} value={item}>
                  {label(`filters.date.${item}`, dateFilterLabels[item])}
                </option>
              ))}
            </select>
            <select
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-3"
            >
              <option value="all">{label("filters.allEntities", "All Modules")}</option>
              {(data?.entities ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-4"
            >
              <option value="all">{label("filters.allActions", "All Actions")}</option>
              {(data?.actions ?? []).map((item) => (
                <option key={item} value={item}>
                  {formatActionLabel(item)}
                </option>
              ))}
            </select>
            {dateFilter === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm xl:col-span-2"
                />
              </>
            )}
          </div>
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </section>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            {label("loading", "Loading activity…")}
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-6">
            {groups.map(([day, entries]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {day}
                </p>
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="divide-y divide-border">
                    {entries.map((entry) => {
                      const EntityIcon = entityIcons[entry.entity] ?? History;
                      const ActionIcon = actionIcon(entry.action);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <EntityIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-card-foreground">
                                {describeEntry(entry)}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${actionTone(entry.action)}`}
                              >
                                <ActionIcon className="h-3 w-3" />
                                {formatActionLabel(entry.action)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {entry.entity} · {entry.entityId}
                              {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                            </p>
                          </div>
                          <p className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                            {dateTimeFormatter.format(new Date(entry.createdAt))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {label("empty", "No activity recorded for the selected filters.")}
          </div>
        )}

        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {label(
                "pagination.summary",
                `Page ${numberFormatter.format(page)} of ${numberFormatter.format(
                  totalPages,
                )} · ${numberFormatter.format(data.total)} events`,
                {
                  page: numberFormatter.format(page),
                  totalPages: numberFormatter.format(totalPages),
                  total: numberFormatter.format(data.total),
                },
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {label("pagination.previous", "Previous")}
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {label("pagination.next", "Next")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
